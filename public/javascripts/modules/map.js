import axios from 'axios';
import { $ } from './bling';
import dompurify from 'dompurify';

const mapOptions = {
  center: { lat: 43.2, lng: -79.8 },
  zoom: 10,
}

function loadPlaces(map, lat = 43.2, lng = -79.8) {
  axios.get(`/api/v1/stores/near/?lat=${lat}&lng=${lng}`)
    .then((res) => {
      const places = res.data;
      if (!places.length) {
        console.log('No places found');
        return;
      }
      // Create bounds: for optimal zoom level
      const bounds = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow(); // Popup with info

      const markers = places.map((place) => {
        // Data from DB comes as [lng, lat]
        const [placeLng, placeLat] = place.location.coordinates;
        const position = { lat: placeLat, lng: placeLng };
        bounds.extend(position);

        const marker = new google.maps.Marker({ map, position });
        marker.place = place;
        return marker;
      });

      // When someone clicks on a marker, show the details of that place
      markers.forEach((marker) => marker.addListener('click', function() {
        const html = `
          <div class="popup">
            <a href="/stores/${this.place.slug}">
              <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
              <p>${this.place.name} - ${this.place.location.address}</p>
            </a>
          </div>
        `
        infoWindow.setContent(dompurify.sanitize(html));
        infoWindow.open(map, this);
      }));

      // Then zoom the map to fit all the markers perfectly
      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    })
    .catch(console.error);
}

function makeMap(mapDiv) {
  if (!mapDiv) return;
  // Make our map
  const map = new google.maps.Map(mapDiv, mapOptions);
  loadPlaces(map);

  const input = $('[name="geolocate"]');
  const autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
  });
}

export default makeMap;