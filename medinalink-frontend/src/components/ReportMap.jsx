import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix l'icône par défaut Leaflet (bug connu avec Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Couleurs des marqueurs selon le statut
const statusColors = {
  PENDING:     '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  RESOLVED:    '#10B981',
  REJECTED:    '#EF4444',
};

// Icône colorée personnalisée
function createColoredIcon(color) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

const categoryLabels = {
  ROAD:'🚧 Route', LIGHTING:'💡 Éclairage',
  WATER:'💧 Eau', WASTE:'🗑️ Déchets',
  GREENSPACE:'🌳 Espaces verts', OTHER:'📌 Autre',
};

const statusLabels = {
  PENDING:'En attente', IN_PROGRESS:'En cours',
  RESOLVED:'Résolu', REJECTED:'Rejeté',
};

export default function ReportMap({ reports }) {
  // Centre par défaut : Casablanca
  const center = [33.5731, -7.5898];

  return (
    <div style={{ height:'calc(100vh - 130px)', width:'100%' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height:'100%', width:'100%' }}
      >
        {/* Fond de carte OpenStreetMap (gratuit) */}
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marqueur pour chaque signalement */}
        {reports.map((report) => {
          if (!report.latitude || !report.longitude) return null;

          const color = statusColors[report.status] || '#F59E0B';
          const icon = createColoredIcon(color);

          return (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={icon}
            >
              {/* Popup au clic sur le marqueur */}
              <Popup maxWidth={250}>
                <div style={{ fontFamily:'sans-serif' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                    <strong style={{ fontSize:'14px', color:'#1a365d' }}>
                      {categoryLabels[report.category] || '📌'}
                    </strong>
                    <span style={{
                      fontSize:'11px',
                      padding:'2px 8px',
                      borderRadius:'12px',
                      backgroundColor: color + '22',
                      color: color,
                      fontWeight:'600',
                    }}>
                      {statusLabels[report.status]}
                    </span>
                  </div>

                  <p style={{ fontSize:'13px', fontWeight:'600', margin:'0 0 4px', color:'#2d3748' }}>
                    {report.title}
                  </p>

                  {report.description && (
                    <p style={{ fontSize:'12px', color:'#718096', margin:'0 0 6px', lineHeight:'1.4' }}>
                      {report.description}
                    </p>
                  )}

                  {report.address && (
                    <p style={{ fontSize:'11px', color:'#a0aec0', margin:'0 0 4px' }}>
                      📍 {report.address}
                    </p>
                  )}

                  <p style={{ fontSize:'11px', color:'#a0aec0', margin:0 }}>
                    👤 {report.userFullName} · 👍 {report.upvotes}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Cercles de heatmap : zones avec plusieurs signalements */}
        {reports
          .filter(r => r.status === 'PENDING')
          .map((report) => {
            if (!report.latitude || !report.longitude) return null;
            return (
              <Circle
                key={`circle-${report.id}`}
                center={[report.latitude, report.longitude]}
                radius={150}
                pathOptions={{
                  color: '#F59E0B',
                  fillColor: '#F59E0B',
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              />
            );
          })}

      </MapContainer>

      {/* Légende */}
      <div style={{
        position:'absolute',
        bottom:'40px',
        right:'10px',
        backgroundColor:'white',
        padding:'10px 14px',
        borderRadius:'8px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
        zIndex:1000,
        fontSize:'12px',
      }}>
        <p style={{ fontWeight:'600', margin:'0 0 6px', color:'#1a365d' }}>Légende</p>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
            <div style={{ width:'12px', height:'12px', borderRadius:'50%', backgroundColor:color }}></div>
            <span style={{ color:'#4a5568' }}>{statusLabels[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}