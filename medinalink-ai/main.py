import os
import json
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
MODEL  = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

app = FastAPI(title="MedinaLink AI Service")

# ══════════════════════════════════════════════════════════════════
#  LOGGING COLORÉ
# ══════════════════════════════════════════════════════════════════

C = {
    "cyan":    "\033[96m",
    "green":   "\033[92m",
    "yellow":  "\033[93m",
    "blue":    "\033[94m",
    "magenta": "\033[95m",
    "red":     "\033[91m",
    "bold":    "\033[1m",
    "dim":     "\033[2m",
    "reset":   "\033[0m",
}

def log(msg: str, color: str = "cyan"):
    print(f"{C.get(color,'')}{msg}{C['reset']}", flush=True)

# ══════════════════════════════════════════════════════════════════
#  SYSTEM PROMPTS — chaque agent a son propre prompt métier précis
# ══════════════════════════════════════════════════════════════════

SYSTEM_CLASSIFY = """Tu es l'agent de classification IA de MedinaLink, spécialisé dans les signalements urbains des villes marocaines.

Ta tâche UNIQUE : analyser le titre et la description d'un signalement et retourner STRICTEMENT un objet JSON valide, sans aucun texte avant ou après.

━━━ CATÉGORIES ━━━
• ROAD       → routes, trottoirs, nids-de-poule, panneaux de signalisation, ralentisseurs, chaussées dégradées
• LIGHTING   → réverbères cassés ou absents, éclairage public défaillant, zones sombres la nuit
• WATER      → fuites d'eau, canalisation cassée, réseau hydraulique, inondation, égout bouché
• WASTE      → déchets non collectés, dépôts sauvages, poubelles débordantes, pollution visible
• GREENSPACE → parcs, espaces verts, arbres dangereux, jardins publics, pelouses abandonnées
• OTHER      → tout ce qui ne correspond à aucune catégorie ci-dessus

━━━ NIVEAUX DE PRIORITÉ ━━━
5 → CRITIQUE : danger immédiat pour la vie humaine (trou profond sur axe passant, câble électrique tombé, fuite de gaz, inondation active)
4 → HAUTE    : risque de sécurité important ou impact sur de nombreuses personnes (route impraticable, panne totale d'éclairage d'un quartier)
3 → MODÉRÉE  : gêne notable mais non urgente (trottoir fissuré, lampe clignotante, fuite mineure, déchets depuis plusieurs jours)
2 → FAIBLE   : problème mineur, peu d'impact (peinture effacée, poubelle renversée isolée, herbe haute dans un parc)
1 → COSMÉTIQUE : suggestion d'amélioration ou demande d'embellissement

━━━ EXEMPLES RÉELS ━━━
Entrée: "Titre: Nid-de-poule profond route N1 Casablanca\nDescription: Trou de 50cm, des pneus ont déjà crevé, dangereux la nuit"
Sortie: {"category": "ROAD", "priority": 5, "confidence": 0.97}

Entrée: "Titre: Réverbère cassé rue Al Qods Rabat\nDescription: Éteint depuis 3 semaines, rue très sombre la nuit, insécurité"
Sortie: {"category": "LIGHTING", "priority": 3, "confidence": 0.94}

Entrée: "Titre: Fuite d'eau majeure devant l'école Boulaid\nDescription: Canalisation qui coule depuis hier matin, eau partout sur le trottoir"
Sortie: {"category": "WATER", "priority": 4, "confidence": 0.96}

Entrée: "Titre: Déchets entassés dans le quartier Hay Riad\nDescription: Dépôt sauvage de sacs poubelles depuis 5 jours, odeurs"
Sortie: {"category": "WASTE", "priority": 3, "confidence": 0.91}

Entrée: "Titre: Quelques dalles cassées sur le trottoir\nDescription: Pas très urgent mais ça gêne les piétons"
Sortie: {"category": "ROAD", "priority": 2, "confidence": 0.85}

Entrée: "Titre: Arbre tombé bloque la route après l'orage\nDescription: Un grand arbre obstrue complètement la voie, impossible de passer"
Sortie: {"category": "GREENSPACE", "priority": 5, "confidence": 0.95}

━━━ RÈGLE ABSOLUE ━━━
Retourne UNIQUEMENT le JSON. Aucun texte, aucune explication, aucun commentaire.
Format exact : {"category": "CATÉGORIE", "priority": ENTIER, "confidence": FLOTTANT}"""


SYSTEM_ANALYZE = """Tu es un expert analyste municipal IA pour MedinaLink, la plateforme de signalement urbain pour les villes marocaines.

Tu fournis des analyses professionnelles et structurées des signalements citoyens pour aider les agents municipaux à prendre des décisions rapides et éclairées.

CONTEXTE : Tu connais les enjeux urbains marocains — infrastructure vieillissante, surpopulation de certains quartiers, périodes de pluies intenses, problèmes récurrents de voirie, réseaux d'eau et d'assainissement.

━━━ FORMAT DE RÉPONSE OBLIGATOIRE ━━━
Respecte EXACTEMENT cette structure en 6 sections. Utilise le formatage Markdown.

**1. RÉSUMÉ**
[1 à 2 phrases décrivant clairement le problème : nature, localisation, contexte]

**2. NIVEAU D'URGENCE**
[Faible / Modérée / Haute / Critique] — [Justification en une phrase précise incluant le risque réel]

**3. IMPACT CITOYEN**
[Estimation du nombre de personnes affectées, type d'impact sur leur quotidien, groupes vulnérables éventuellement concernés]

**4. ACTIONS RECOMMANDÉES**
• Action prioritaire : [action concrète avec délai suggéré, ex: "Intervention dans les 24h pour sécurisation"]
• Action de suivi : [action complémentaire à planifier]
• Ressources nécessaires : [équipes/matériel spécifique si pertinent]

**5. RÉPONSE SUGGÉRÉE AU CITOYEN**
"[Message professionnel et bienveillant en 2-3 phrases à envoyer directement au citoyen. Doit confirmer la réception, informer du délai estimé, et rassurer.]"

**6. ANALYSE DOUBLONS**
[Oui/Non] — [Si Oui : indiquer précisément quel(s) signalement(s) proche(s) semble(nt) lié(s) et pourquoi. Si Non : confirmer que le signalement est unique dans la zone.]

━━━ RÈGLES ━━━
• Baser l'urgence sur les votes citoyens (signal de gravité collective), la catégorie et la description
• Pour les catégories WATER et ROAD avec priorité ≥ 4 : toujours recommander intervention urgente
• Si nearby_reports contient des signalements de même catégorie : analyser systématiquement les doublons"""


SYSTEM_CITIZEN = """━━━ RÈGLE DE LANGUE ABSOLUE ━━━
Réponds TOUJOURS dans la langue exacte de l'utilisateur.
Français → français | العربية → عربية | English → English | Darija → دارجة
Ne change JAMAIS de langue en cours de conversation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tu es l'assistant IA citoyen de MedinaLink, la plateforme officielle de signalement urbain pour les villes marocaines.
Tu aides les citoyens à signaler efficacement les problèmes de leur quartier pour qu'ils soient résolus le plus rapidement possible.

TES MISSIONS :
• Aider à décrire le problème avec précision (maximise les chances de résolution rapide)
• Suggérer la catégorie la plus adaptée parmi : Route, Éclairage, Eau, Déchets, Espaces verts
• Demander les informations manquantes cruciales : localisation exacte (rue + quartier + point de repère), durée du problème, niveau de danger
• Informer sur le processus : le signalement est transmis aux équipes municipales et suivi en temps réel
• Répondre aux questions sur les statistiques de la plateforme en utilisant les données réelles fournies

CONSEILS PROACTIFS :
• Si problème de sécurité immédiate → recommander aussi d'appeler le 15 (SAMU), 19 (Police), 150 (Protection Civile)
• Si fuite d'eau → mentionner de contacter la RADEEMA/LYDEC/ONEE selon la ville en parallèle
• Si signalement vague → demander une photo et l'adresse exacte

STYLE : Bienveillant, efficace, concis. Maximum 3-4 phrases par réponse."""


SYSTEM_AGENT = """━━━ RÈGLE DE LANGUE ABSOLUE ━━━
Réponds TOUJOURS dans la langue exacte de l'utilisateur.
Français → français | العربية → عربية | English → English
Ne change JAMAIS de langue.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tu es l'assistant IA municipal de MedinaLink, expert en gestion de signalements urbains pour les villes marocaines.
Tu assistes les agents et administrateurs municipaux dans leur travail quotidien.

TES CAPACITÉS :
• Résumer et évaluer n'importe quel signalement avec précision
• Évaluer le niveau d'urgence et le risque pour la sécurité publique
• Proposer des actions concrètes avec délais d'intervention recommandés
• Identifier des doublons ou patterns dans les signalements
• Rédiger des réponses professionnelles à envoyer aux citoyens
• Analyser des tendances ou statistiques quand le contexte est fourni
• Suggérer des priorisations en cas de ressources limitées

CONTEXTE OPÉRATIONNEL :
• Les agents traitent des signalements au Maroc : villes avec des infrastructures hétérogènes, zones à forte densité
• Critères d'urgence locaux : proximité d'école ou hôpital, axe passant, période de pluies, quartier défavorisé

STYLE : Professionnel, orienté action, structuré. Utilise des bullet points. Sois direct et précis."""


# ══════════════════════════════════════════════════════════════════
#  REGISTRY DES AGENTS — paramètres optimisés pour la précision
# ══════════════════════════════════════════════════════════════════

AGENTS = {
    "classifier": {
        "name":        "Classification Agent",
        "system":      SYSTEM_CLASSIFY,
        "temperature": 0.05,   # très déterministe → JSON stable
        "top_p":       0.1,    # distribution très concentrée
        "max_tokens":  80,     # on veut juste {"category":"X","priority":N,"confidence":N}
        "description": "Classifie automatiquement les signalements urbains en catégorie + priorité",
    },
    "citizen_assistant": {
        "name":        "Citizen Assistant Agent",
        "system":      SYSTEM_CITIZEN,
        "temperature": 0.4,    # réduit de 0.7 → plus cohérent, moins de divagation
        "top_p":       0.85,
        "max_tokens":  700,    # augmenté de 500 pour réponses complètes
        "description": "Aide les citoyens à décrire et catégoriser leurs problèmes",
    },
    "municipal_agent": {
        "name":        "Municipal Agent",
        "system":      SYSTEM_AGENT,
        "temperature": 0.3,    # réduit de 0.5 → plus précis
        "top_p":       0.9,
        "max_tokens":  900,    # augmenté de 500 pour analyses détaillées
        "description": "Répond aux questions des agents municipaux sur les signalements",
    },
    "analyzer": {
        "name":        "Report Analyzer Agent",
        "system":      SYSTEM_ANALYZE,   # MAINTENANT un prompt dédié (était SYSTEM_AGENT)
        "temperature": 0.15,   # réduit de 0.3 → analyse très structurée et reproductible
        "top_p":       0.8,
        "max_tokens":  1100,   # augmenté de 600 → permet les 6 sections complètes
        "description": "Analyse complète et structurée d'un signalement avec contexte géospatial",
    },
}

# ══════════════════════════════════════════════════════════════════
#  ORCHESTRATEUR
# ══════════════════════════════════════════════════════════════════

def orchestrate(request_type: str, context_type: str = None) -> dict:
    if request_type == "classify":
        agent_key = "classifier"
    elif request_type == "chat":
        agent_key = "citizen_assistant" if context_type == "citizen" else "municipal_agent"
    elif request_type == "analyze":
        agent_key = "analyzer"
    else:
        agent_key = "citizen_assistant"

    agent = AGENTS[agent_key]

    agent_styles = {
        "classifier":        (C["green"],   "🟢", "classify"),
        "citizen_assistant": (C["cyan"],    "🔵", "chat + citizen"),
        "municipal_agent":   (C["magenta"], "🟣", "chat + agent"),
        "analyzer":          (C["red"],     "🔴", "analyze"),
    }
    color, icon, rule = agent_styles[agent_key]
    W = 62

    def box(text=""):
        return f"  ║ {text.ljust(W - 4)} ║"

    top = "  ╔" + "═" * (W - 4) + "╗"
    mid = "  ╠" + "═" * (W - 4) + "╣"
    bot = "  ╚" + "═" * (W - 4) + "╝"

    print(flush=True)
    print(f"{C['bold']}{C['blue']}{top}{C['reset']}", flush=True)
    print(f"{C['bold']}{C['blue']}{box('ORCHESTRATEUR  —  Routing Decision'.center(W - 4))}{C['reset']}", flush=True)
    print(f"{C['bold']}{C['blue']}{mid}{C['reset']}", flush=True)

    req_label = f"{request_type}" + (f"  (ctx: {context_type})" if context_type else "")
    print(f"{C['blue']}  ║ {C['reset']}{C['dim']}Requête : {C['reset']}{C['yellow']}{req_label}{C['reset']}", flush=True)
    print(f"{C['blue']}  ║ {C['reset']}{C['dim']}Règle   : {C['reset']}{C['cyan']}{rule}{C['reset']}", flush=True)
    print(f"{C['blue']}  ║ {C['reset']}{C['dim']}Agent   : {C['reset']}{color}{C['bold']}{icon} {agent['name']}{C['reset']}", flush=True)

    temp = agent["temperature"]
    bar_len = 20
    bar_fill = round(temp * bar_len)
    temp_bar = "█" * bar_fill + "░" * (bar_len - bar_fill)
    temp_color = C["green"] if temp <= 0.2 else C["yellow"] if temp <= 0.4 else C["red"]
    print(f"{C['blue']}  ║ {C['reset']}{C['dim']}Temp.   : {C['reset']}{temp_color}{temp_bar} {temp}{C['reset']}", flush=True)
    print(f"{C['blue']}  ║ {C['reset']}{C['dim']}Tokens  : {C['reset']}{C['cyan']}{agent['max_tokens']}{C['reset']}", flush=True)
    print(f"{C['blue']}  ║ {C['reset']}{C['dim']}top_p   : {C['reset']}{C['cyan']}{agent.get('top_p', 'N/A')}{C['reset']}", flush=True)
    print(f"{C['bold']}{C['blue']}{bot}{C['reset']}", flush=True)
    print(flush=True)

    return agent

@app.on_event("startup")
async def startup():
    log(f"{'='*58}", "cyan")
    log(f"  MedinaLink AI Service — Multi-Agent Orchestrator", "cyan")
    log(f"  Provider : Groq  |  Model : {MODEL}", "green")
    log(f"  Agents   : {len(AGENTS)}", "green")
    for key, agent in AGENTS.items():
        log(f"    [{key}] {agent['name']} — T={agent['temperature']} top_p={agent.get('top_p','N/A')} max={agent['max_tokens']}", "yellow")
    log(f"{'='*58}\n", "cyan")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════
#  MODÈLES PYDANTIC
# ══════════════════════════════════════════════════════════════════

class ClassifyRequest(BaseModel):
    title: str
    description: str = ""

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context_type: str
    report_data: Optional[dict] = None

class AnalyzeRequest(BaseModel):
    title: str
    description: str = ""
    category: str = "OTHER"
    status: str = "PENDING"
    upvotes: int = 0
    address: str = ""
    nearby_reports: list[dict] = []

# ══════════════════════════════════════════════════════════════════
#  APPELS GROQ — avec top_p et retry
# ══════════════════════════════════════════════════════════════════

VALID_CATEGORIES = {"ROAD", "LIGHTING", "WATER", "WASTE", "GREENSPACE", "OTHER"}

def _groq_call(system: str, user: str, temperature: float, max_tokens: int, top_p: float) -> str:
    """Appel bas-niveau à l'API Groq."""
    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    return completion.choices[0].message.content.strip()


def _groq_chat(system: str, messages: list[ChatMessage], temperature: float, max_tokens: int, top_p: float) -> str:
    """Appel avec historique de conversation complet."""
    msgs = [{"role": "system", "content": system}]
    for m in messages:
        msgs.append({"role": "user" if m.role == "user" else "assistant", "content": m.content})
    completion = client.chat.completions.create(
        model=MODEL,
        messages=msgs,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    return completion.choices[0].message.content.strip()


def call_agent(agent: dict, user_text: str) -> str:
    log(f"[GROQ] → {agent['name']} | T={agent['temperature']} top_p={agent.get('top_p',1.0)} max={agent['max_tokens']}", "cyan")
    log(f"[GROQ] Input: {user_text[:100]}{'...' if len(user_text) > 100 else ''}", "yellow")
    result = _groq_call(
        system=agent["system"],
        user=user_text,
        temperature=agent["temperature"],
        max_tokens=agent["max_tokens"],
        top_p=agent.get("top_p", 1.0),
    )
    log(f"[GROQ] ✓ Response ({len(result)} chars)", "green")
    return result


def call_agent_chat(agent: dict, messages: list[ChatMessage]) -> str:
    last_user = next((m.content for m in reversed(messages) if m.role == "user"), "")
    log(f"[GROQ] → {agent['name']} | T={agent['temperature']} top_p={agent.get('top_p',1.0)} | msg: {last_user[:80]}", "cyan")
    result = _groq_chat(
        system=agent["system"],
        messages=messages,
        temperature=agent["temperature"],
        max_tokens=agent["max_tokens"],
        top_p=agent.get("top_p", 1.0),
    )
    log(f"[GROQ] ✓ Response ({len(result)} chars)", "green")
    return result


def classify_with_retry(agent: dict, user_text: str, max_retries: int = 3) -> dict:
    """
    Appel classifier avec retry et validation stricte du JSON.
    Tente d'extraire un JSON valide même si le modèle ajoute du texte autour.
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                log(f"[CLASSIFY] Retry {attempt}/{max_retries - 1}...", "yellow")
                time.sleep(0.3 * attempt)  # petit backoff

            raw = call_agent(agent, user_text)

            # 1. Chercher le premier JSON valide dans la réponse
            start = raw.find("{")
            end   = raw.rfind("}") + 1
            if start == -1 or end <= start:
                raise ValueError(f"Aucun JSON trouvé dans : {raw[:120]}")

            candidate = raw[start:end]
            parsed = json.loads(candidate)

            # 2. Valider les champs obligatoires
            category   = str(parsed.get("category", "OTHER")).upper().strip()
            priority   = int(parsed.get("priority", 2))
            confidence = float(parsed.get("confidence", 0.75))

            # 3. Valider les valeurs
            if category not in VALID_CATEGORIES:
                log(f"[CLASSIFY] Catégorie invalide '{category}' → OTHER", "yellow")
                category = "OTHER"
            priority = max(1, min(5, priority))
            confidence = max(0.0, min(1.0, confidence))

            log(f"[CLASSIFY] ✓ cat={category} prio={priority} conf={confidence:.2f}", "green")
            return {"category": category, "priority": priority, "confidence": confidence}

        except Exception as e:
            last_error = e
            log(f"[CLASSIFY] Attempt {attempt + 1} failed: {e}", "red")

    # Fallback après tous les retries
    log(f"[CLASSIFY] All retries failed. Last error: {last_error}. Returning fallback.", "red")
    return {"category": "OTHER", "priority": 2, "confidence": 0.0}

# ══════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {
        "status":   "ok",
        "model":    MODEL,
        "provider": "groq",
        "agents":   {
            k: {
                "name":        v["name"],
                "temperature": v["temperature"],
                "top_p":       v.get("top_p"),
                "max_tokens":  v["max_tokens"],
                "description": v["description"],
            }
            for k, v in AGENTS.items()
        },
    }

@app.get("/agents")
def list_agents():
    return {
        key: {
            "name":           a["name"],
            "description":    a["description"],
            "temperature":    a["temperature"],
            "top_p":          a.get("top_p"),
            "max_tokens":     a["max_tokens"],
            "prompt_preview": a["system"][:150] + "...",
        }
        for key, a in AGENTS.items()
    }


@app.post("/classify")
def classify(request: ClassifyRequest):
    """Classifie automatiquement un signalement avec retry et validation."""
    agent = orchestrate("classify")
    user_text = f"Titre: {request.title.strip()}\nDescription: {request.description.strip()}"
    return classify_with_retry(agent, user_text)


@app.post("/chat")
def chat(request: ChatRequest):
    """Chat citoyen ou agent avec injection du contexte réel."""
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages requis")

    agent = orchestrate("chat", request.context_type)

    # ── Enrichissement du prompt pour le chat citoyen ──
    if request.context_type == "citizen" and request.report_data and "db_stats" in request.report_data:
        s = request.report_data["db_stats"]
        enriched = agent["system"] + (
            f"\n\n━━━ STATISTIQUES RÉELLES MedinaLink ━━━\n"
            f"• Total signalements  : {s.get('total_reports', 0)}\n"
            f"• En attente          : {s.get('pending', 0)}\n"
            f"• En cours            : {s.get('in_progress', 0)}\n"
            f"• Résolus             : {s.get('resolved', 0)}\n"
            f"• Rejetés             : {s.get('rejected', 0)}\n"
            f"Source : base de données PostgreSQL en temps réel.\n"
        )
        reports_list = request.report_data.get("reports_list", [])
        if reports_list:
            enriched += "\n━━━ SIGNALEMENTS RÉCENTS ━━━\n"
            enriched += "| # | Titre | Catégorie | Statut | Adresse |\n"
            enriched += "|---|-------|-----------|--------|---------|\n"
            for i, r in enumerate(reports_list[:25], 1):
                enriched += (
                    f"| {i} | {r.get('title','')[:40]} | {r.get('category','')} "
                    f"| {r.get('status','')} | {r.get('address','')[:30]} |\n"
                )
            enriched += (
                "\nSi le citoyen demande la liste des signalements, "
                "affiche ce tableau Markdown avec toutes les colonnes."
            )
        agent = {**agent, "system": enriched}

    # ── Enrichissement du prompt pour le chat agent ──
    if request.context_type == "agent" and request.report_data:
        r = request.report_data
        enriched = agent["system"] + (
            f"\n\n━━━ CONTEXTE DU SIGNALEMENT ━━━\n"
            f"• Titre       : {r.get('title', '')}\n"
            f"• Catégorie   : {r.get('category', '')}\n"
            f"• Statut      : {r.get('status', '')}\n"
            f"• Adresse     : {r.get('address', '')}\n"
            f"• Description : {r.get('description', '')}\n"
            f"• Votes citoyens : {r.get('upvotes', 0)}\n"
            f"• Notes agent : {r.get('agentNotes', 'Aucune')}\n"
        )
        agent = {**agent, "system": enriched}

    try:
        reply = call_agent_chat(agent, request.messages)
        return {"reply": reply}
    except Exception as e:
        log(f"[Chat Error] {e}", "red")
        raise HTTPException(status_code=500, detail=f"Erreur IA : {str(e)}")


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    """Analyse structurée complète d'un signalement (6 sections)."""
    agent = orchestrate("analyze")

    # Construire le contexte des signalements proches
    nearby_text = ""
    if request.nearby_reports:
        nearby_text = "\n━━━ SIGNALEMENTS DANS UN RAYON DE 1KM ━━━\n"
        for i, r in enumerate(request.nearby_reports[:6], 1):
            nearby_text += (
                f"{i}. [{r.get('category','')}] {r.get('title','')} "
                f"— Statut : {r.get('status','')} "
                f"— Votes : {r.get('upvotes', 0)}\n"
            )
        nearby_text += "\n"
    else:
        nearby_text = "\n(Aucun signalement similaire dans la zone immédiate)\n"

    # Prompt riche avec toutes les données disponibles
    prompt = (
        f"Analyse ce signalement urbain marocain :\n\n"
        f"━━━ DONNÉES DU SIGNALEMENT ━━━\n"
        f"• Titre       : {request.title}\n"
        f"• Catégorie   : {request.category}\n"
        f"• Statut actuel : {request.status}\n"
        f"• Adresse     : {request.address if request.address else 'Non précisée'}\n"
        f"• Description : {request.description if request.description else 'Non fournie'}\n"
        f"• Votes citoyens : {request.upvotes} {'(signal fort de gravité)' if request.upvotes >= 5 else ''}\n"
        f"{nearby_text}\n"
        f"Fournis une analyse complète selon les 6 sections définies dans tes instructions."
    )

    try:
        analysis_text = call_agent(agent, prompt)
        return {"analysis": analysis_text}
    except Exception as e:
        log(f"[Analyze Error] {e}", "red")
        raise HTTPException(status_code=500, detail=f"Erreur analyse : {str(e)}")
