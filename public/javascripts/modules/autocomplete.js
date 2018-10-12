function autocomplete (input, latInput, lngInput) {
  if (!input) return;
  const dropdown = new google.maps.places.Autocomplete(input);

  // addListener() is Google Maps way to add an event listener
  dropdown.addListener('place_changed', () => {
    const place = dropdown.getPlace();
    latInput.value = place.geometry.location.lat();
    lngInput.value = place.geometry.location.lng();
  });

  // If someone hits enter on the input, don't submit the form
  input.on('keydown', (event) => {
    // If Enter was hit
    if (event.keyCode === 13) {
      event.preventDefault();
    }
  });

}

export default autocomplete