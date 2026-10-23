import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export default function MapView({
  places,
  selected,
  onSelect,
  position,
  route,
  dark,
}) {
  const el = useRef(),
    map = useRef(),
    markers = useRef(),
    positionLayer = useRef(),
    routeLayer = useRef();
  const click = useRef(onSelect);
  click.current = onSelect;
  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false }).setView(
      [10.779, 106.7],
      15,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(m);
    L.control.zoom({ position: "topright" }).addTo(m);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(m);
    map.current = m;
    markers.current = L.layerGroup().addTo(m);
    positionLayer.current = L.layerGroup().addTo(m);
    routeLayer.current = L.layerGroup().addTo(m);
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      m.remove();
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    markers.current.clearLayers();
    places.forEach((p, i) => {
      const active = p.id === selected?.id;
      L.circle([p.latitude, p.longitude], {
        radius: p.radiusM,
        color: active ? "#c56a43" : "#2e6655",
        weight: 1,
        fillOpacity: active ? 0.14 : 0.05,
      }).addTo(markers.current);
      const icon = L.divIcon({
        className: "place-pin",
        html: `<span class="${active ? "active" : ""}">${String(i + 1).padStart(2, "0")}</span>`,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
      });
      const marker = L.marker([p.latitude, p.longitude], {
        icon,
        keyboard: true,
        title: p.name,
      })
        .addTo(markers.current)
        .on("click", () => click.current(p));
      const label = document.createElement("span");
      label.textContent = p.name;
      marker.bindTooltip(label, { direction: "top", offset: [0, -42] });
    });
  }, [places, selected]);
  useEffect(() => {
    if (selected && map.current) {
      map.current.invalidateSize({ animate: false });
      const size = map.current.getSize();
      if (size.x > 0 && size.y > 0)
        map.current.setView([selected.latitude, selected.longitude], 16, {
          animate: false,
        });
    }
  }, [selected?.id]);
  useEffect(() => {
    if (!positionLayer.current) return;
    positionLayer.current.clearLayers();
    if (position) {
      L.circle([position.latitude, position.longitude], {
        radius: Math.min(position.accuracy, 500),
        color: "#3983b5",
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(positionLayer.current);
      L.circleMarker([position.latitude, position.longitude], {
        radius: 7,
        color: "white",
        weight: 3,
        fillColor: "#3983b5",
        fillOpacity: 1,
      }).addTo(positionLayer.current);
    }
  }, [position]);
  useEffect(() => {
    if (!routeLayer.current) return;
    routeLayer.current.clearLayers();
    if (route && position) {
      const points = [
        [position.latitude, position.longitude],
        [route.latitude, route.longitude],
      ];
      L.polyline(points, {
        color: "#c56a43",
        weight: 4,
        dashArray: "8 9",
      }).addTo(routeLayer.current);
      map.current.fitBounds(points, { padding: [60, 60], maxZoom: 16 });
    }
  }, [route, position]);
  return (
    <div
      ref={el}
      className={`map-canvas ${dark ? "map-dark" : ""}`}
      aria-label="Leaflet OpenStreetMap"
    />
  );
}
