"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type TaxistaItem = {
  id: string;
  nome: string;
  apelido: string;
  lat?: number | null;
  lng?: number | null;
  moto: null | { nomeMoto: string; matricula: string };
};

type Props = {
  taxistas: TaxistaItem[];
  selectedId: string;
  onSelect: (taxista: TaxistaItem) => void;
};

const DEFAULT_CENTER: [number, number] = [-25.9653, 32.5892];

function makeDivIcon(active: boolean) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 18px; height: 18px; border-radius: 9999px;
        background: ${active ? "#facc15" : "#22c55e"};
        border: 3px solid #111318;
        box-shadow: 0 6px 18px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function FitToMarkers({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

export default function TaxistasMap({ taxistas, selectedId, onSelect }: Props) {
  const points = useMemo(() => {
    return taxistas
      .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng))
      .map((t) => [t.lat as number, t.lng as number] as [number, number]);
  }, [taxistas]);

  const center = points[0] ?? DEFAULT_CENTER;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-800 bg-[#0f1117]">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: "100%", height: 360 }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitToMarkers points={points} />

        {taxistas.map((t) => {
          if (!Number.isFinite(t.lat) || !Number.isFinite(t.lng)) return null;

          const pos: [number, number] = [t.lat as number, t.lng as number];
          const active = selectedId === t.id;

          return (
            <Marker
              key={t.id}
              position={pos}
              icon={makeDivIcon(active)}
              eventHandlers={{ click: () => onSelect(t) }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>
                    {t.nome} {t.apelido}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {t.moto ? `${t.moto.nomeMoto} • ${t.moto.matricula}` : "Sem moto"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>Clique para selecionar</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}