import L from 'leaflet';

const map = L.map(document.createElement('div'));
map.setView([10.794, 106.719], 14);

const p1 = map.project([10.794, 106.719], 14);
console.log('Projected point:', p1);
const p2 = p1.add([-192, 0]);
console.log('Shifted point:', p2);
const ll = map.unproject(p2, 14);
console.log('Unprojected LatLng:', ll);
