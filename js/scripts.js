/**
 * Constants
 */
const PlotType = {
  CURRENTPLOT: 1,
  CENTRALPLOT: 2,
  POIPLOT: 3
}

/**
 * Location and Google functions
 */

/**
 * This function returns the coordinates from a given address as an array with the latitude and longitude.
 */
getCoordinates = function (address, asyncCoordinates) {
  var coordinates = [];
  geocoder.geocode({'address': address}, function(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      coordinates_object = results[0].geometry.location;
      if(Number.isNaN(coordinates_object.lat()) || Number.isNaN(coordinates_object.lng())) {
        alert('No allowed');
      } else {
        coordinates = [coordinates_object.lat(),coordinates_object.lng()];
        asyncCoordinates(coordinates);
      }
    } else {
      reset();
    }
  });
}

function getAddressesCoordinates(addresses, asyncAddressesCoordinates) {
  for (var index in addresses) {
    var newAddress = 'The Netherlands, '.concat(addresses[index]);
    getCoordinates(newAddress, function(coordinates) {
      asyncAddressesCoordinates(coordinates);
    });
  }
}

var markers = [];
function plotAddress(latitude, longitude, plotType) {
  let marker = new google.maps.Marker({
    map: map,
    position: new google.maps.LatLng(latitude, longitude),
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
    }
  });

  switch(plotType) {
    case PlotType.CURRENTPLOT:
      marker.icon.url = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
      marker.setVisible(false);
      break;
    case PlotType.CENTRALPLOT:
      marker.icon.url = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
      marker.setVisible(true);
      
      break;
    case PlotType.POIPLOT:
      marker.icon.url = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
      marker.setVisible(true);
      break;
  }
  markers.push(marker);
  return marker;
}

function suppressMarkers(suppress) {
  for(var marker in markers) {
    if(suppress) {
      markers[marker].setVisible(false);
    }
    else
    {
      markers[marker].setVisible(true);
    }
  }
}

function plotCurrentAddresses(refresh) {
  let cells = getAddressesFromSelect();
  getAddressesCoordinates(cells, function(coordinates) {
    plotAddress(coordinates[0], coordinates[1], PlotType.CURRENTPLOT);
  });

  if(refresh == true) {
    runMidpoint();
  }
}

function valideValueCheck() {
  if(markers || initial == true){
    if(markers.length > 0 || initial == true) {
      return true;
    }
  }
  return false;
}

function plotCentralAddress() {
  suppressMarkers(false);
  var addressesCoordinates = getAllAddressCoordinates();
  var centralPointCoordinates = calculateCentralPoint(addressesCoordinates);
  plotAddress(centralPointCoordinates[0], centralPointCoordinates[1], PlotType.CENTRALPLOT);
  return centralPointCoordinates;
}

function test() {
  var centralCoordinates = [];
  centralCoordinates.push(51.694682022158304);
  centralCoordinates.push(5.12400522488047);
  setCentralAddress('midpointAddress', centralCoordinates);
  // plotAddress(centralCoordinates[0], centralCoordinates[1], PlotType.CENTRALPLOT);
  
  // var filter = getPoiFilters();
  // plotPlaces(map, 2000, centralCoordinates, 1, filter);

  //GetPlaceId(centralCoordinates);
  // var filter = [];
  // filter.push('bakery');
  // plotPlaces(map, 0, centralCoordinates, 1, filter);
}

function getAllAddressCoordinates() {
  var addressCoordinates = [];
  for(var index in markers) {
    var coordinates = [];
    var marker = markers[index];
    if(marker !== null)
    {
      coordinates.push(marker.position.lat());
      coordinates.push(marker.position.lng());
      addressCoordinates.push(coordinates);
    }
  }
  return addressCoordinates;
}

function setMapOnMarkers(map) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}

function ReverseGeocoding(centralAddressFieldId,latitude, longtitude) {
  var address = '';
  var key = 'AIzaSyBdLsVRrzPRAwRCiTSQtG0L1S3Z1bnnB-Y';
  let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longtitude}&key=${key}`;
  fetch(url)
  .then(response => response.json())
  .then(data => {
    address = data.results[0].formatted_address;
    document.getElementById(centralAddressFieldId).innerText = address;
  })
  .catch(err => console.warn(err.message));
}

/**
 * @param latLngInDeg array of arrays with latitude and longtitude
 *   pairs in degrees. e.g. [[latitude1, longtitude1], [latitude2
 *   [longtitude2] ...]
 *
 * @return array with the center latitude longtitude pairs in 
 *   degrees.
 */
function calculateCentralPointV2(latLngInDegr) {
  var LATIDX = 0;
    var LNGIDX = 1;
    var sumX = 0;
    var sumY = 0;
    var sumZ = 0;

    for (var i=0; i<latLngInDegr.length; i++) {
        var lat = degr2rad(latLngInDegr[i][LATIDX]);
        var lng = degr2rad(latLngInDegr[i][LNGIDX]);
        // sum of cartesian coordinates
        sumX += Math.cos(lat) * Math.cos(lng);
        sumY += Math.cos(lat) * Math.sin(lng);
        sumZ += Math.sin(lat);
    }

    var avgX = sumX / latLngInDegr.length;
    var avgY = sumY / latLngInDegr.length;
    var avgZ = sumZ / latLngInDegr.length;

    // convert average x, y, z coordinate to latitude and longtitude
    var lng = Math.atan2(avgY, avgX);
    var hyp = Math.sqrt(avgX * avgX + avgY * avgY);
    var lat = Math.atan2(avgZ, hyp);

    return ([rad2degr(lat), rad2degr(lng)]);
}

function rad2degr(rad) { return rad * 180 / Math.PI; }
function degr2rad(degr) { return degr * Math.PI / 180; }

/**
 * End of Location and Google functions
 */

/**
 * Google Places functions
 */

function plotPlaces(map, radius, coordinates, poiFilterArray) {
    resetPlacesList();
    var placesService = new google.maps.places.PlacesService(map);
    if(poiFilterArray) {
      if(poiFilterArray[0] !== 'all') {
        var request = {
          location: {lat: coordinates[0], lng: coordinates[1]},
          radius: radius,
          query: poiFilterArray[0]
        };
        placesService.textSearch(request, callback1);
      }
      else {
        var request = {
          location: {lat: coordinates[0], lng: coordinates[1]},
          radius: radius,
          type: poiFilterArray
        };
        placesService.textSearch(request, callback1);
      }

      // placesService.nearbySearch({
      //   //placeId: centralPlaceId,
      //   location: {lat: coordinates[0], lng: coordinates[1]},
      //   radius: radius,
      //   types: poiFilterArray
      // }, asyncPlacesDetails);
  }
}

function callback1(results, status) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    cleanPlaceList();
    for (var i = 0; i < results.length; i++) {
      var place = results[i];
      var infowindowElement = createInfoWindowContent(place);
      asyncPlacesDetails(place, status);
    }
  }
}

function asyncPlacesDetails(place, status) {
  var placesService = new google.maps.places.PlacesService(map);
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    
    placesService.getDetails({placeId: place.place_id}, function(place, status) {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        var location = place.geometry.location;
        var marker = plotAddress(location.lat(), location.lng(), PlotType.POIPLOT);
        var infowindowElement = createInfoWindowContent(place);
        addPointOfInterest(infowindowElement);
        google.maps.event.addListener(marker, 'click', function() {
          var infowindow = new google.maps.InfoWindow({
            content: infowindowElement.innerHTML
          });
          infowindow.open(map, this);
        });
      }
    });
  }
}

/**
 * End of Google Places functions
 */

/**
 * Control functions
 */

function createInfoWindowContent(place) {
  var div = document.createElement("div");
  var strong = document.createElement("strong");
  var breakline = document.createElement("br");
  var placeName = document.createTextNode(place.name);
  var placeId = document.createTextNode('Place identifier: '.concat(place.place_id));
  var placeAddress = document.createTextNode('Address: '.concat(place.formatted_address));
  var placePhoneNumber = document.createTextNode('Phone:'.concat(place.formatted_phone_number));

  strong.appendChild(placeName);
  div.appendChild(strong);
  var paragraph = document.createElement("p");
  paragraph.appendChild(placeId);
  paragraph.appendChild(breakline);
  paragraph.appendChild(placeAddress);
  paragraph.appendChild(breakline);
  paragraph.appendChild(placePhoneNumber);
  paragraph.appendChild(breakline);

  if(place.website) {
    var website = document.createTextNode('Website');
    var anchor = document.createElement("a");
    anchor.href = place.website;
    anchor.target = "_blank"
    anchor.appendChild(website);
    paragraph.appendChild(anchor);
  }
  else {
    var website = document.createTextNode('Website unknown');
    paragraph.appendChild(website);
  }

  div.appendChild(paragraph);
  return div;
}

/**
 * Generates a select component filled with the clipboard content which has been pasted. Every row represents one option.
 */
function getAddressesFromInput() {
  var data = removeExtraTabs($('#pastein').val());
  var rows = data.split("\n");
  var cells = extractCellsFromRows(rows);
  return cells;
}

function getAddressesFromSelect() {
  var addresses = [];
  var addressesElement = document.getElementById("addressesSelect");
  for (var index = 0; index < addressesElement.length; index++) {
    var optionValue = addressesElement.options[index].value;
    if(optionValue != null) {
      addresses.push(optionValue);
    }
  }
  return addresses;
}

function generateInputMultipleSelect() {
  let cells = getAddressesFromInput();
  let addresses = createMultipleSelect('addressesSelect');
  let options = convertStringArrayToOptionArray(cells);
  addresses = fillSelectWithOptionArray(addresses, options);
  $('#excel_table').html(addresses);
  toggleElements('pastein', 'addressesSelect');
  //plotAddresses();

  // if(valideValueCheck() == false) {
  //   toggleStatusElement('deleteButton', false);
  //   toggleStatusElement('searchButton', false);
  //   reset();
  // } else {
  //   toggleStatusElement('deleteButton', true);
  //   toggleStatusElement('searchButton', true);
    
  // }
}

/**
 * Removing all tabs from the content.
 */
function removeExtraTabs(string) {
  return string.replace(new RegExp("\t\t", 'g'), "\t");
}

function createMultipleSelect(id) {
  var newSelect = document.createElement("select");
  newSelect.id = id;
  newSelect.multiple = true;
  newSelect.className = 'form-control rounded-0';
  newSelect.size = 8;
  return newSelect;
}

function extractCellsFromRows(rowArray)
{
  var cells = [];
  for (var index in rowArray) {
    rowArray[index] = removeExtraTabs(rowArray[index]);
    var newCell = rowArray[index].split("\t");
    cells.push(newCell);
  }
  return cells;
}

function convertStringArrayToOptionArray(stringArray) {
  var options = [];
  for (var index in stringArray) {
    var newOption = document.createElement("option");
    var newValue = stringArray[index];
    newOption.value = newValue;
    var optionText = document.createTextNode(newValue);
    newOption.appendChild(optionText);
    options.push(newOption);
  }
  return options;
}

function fillSelectWithOptionArray(selectElement, optionArray) {
  if(selectElement) {
    resetSelect(selectElement.id);
    if(optionArray)
    {
      for (var index in optionArray) {
        selectElement.appendChild(optionArray[index]);
      }
    } else {
      var defaultOption = createDefaultOption();
      selectElement.appendChild(defaultOption);
    }
    return selectElement;
  }
}

function createDefaultOption() {
  var newDefaultOption = document.createElement("option");
  var newDefaultOptionText = document.createTextNode("This list has no results");
  newDefaultOption.disabled = true;
  newDefaultOption.appendChild(newDefaultOptionText);
  return newDefaultOption;
}

function resetSelect(selectElementId) {
  var select = document.getElementById(selectElementId);
  if(select) {
    var length = select.options.length;
    for (i = 0; i < length; i++) {
      select.options[i] = null;
    }
  }
}

function toggleElements(elementIdDefaultShow, elementIdDefaultHidden) {
  var elementDefaultShow = document.getElementById(elementIdDefaultShow);
  var elementDefaultHidden = document.getElementById(elementIdDefaultHidden);

  if (elementDefaultShow.style.display === "none") {
    elementDefaultShow.style.display = "block";
    elementDefaultHidden.style.display = "none";
  } else {
    elementDefaultShow.style.display = "none";
    elementDefaultHidden.style.display = "block";
  }
}

function setCentralCoordinates(midpointCoordinatesId, coordinates) {
  var centralpointCoordinatesElement = document.getElementById(midpointCoordinatesId);
  centralpointCoordinatesElement.innerText = coordinates;
}

function setCentralAddress(midpointAddressId, coordinates) {
  ReverseGeocoding(midpointAddressId, coordinates[0], coordinates[1]);
}

function runMidpoint() {
    var centralAddressCoordinates = plotCentralAddress();
    fillOutputFields(centralAddressCoordinates);
}

function run() {
  plotCurrentAddresses(true);
  $(".popover").popover('hide');
  toggleStatusElement('searchButton', false);
  toggleStatusElement('poiFilterSelect', false);
  toggleStatusElement('txtRadius', false);
  initial = false;
}

function deleteAddress() {
  deleteSelectOption('addressesSelect');
  resetDelete();
  plotCurrentAddresses(false);
}



function getPoiFilters() {
  var poiFilterArray = [];
  var poiFilterElement = document.getElementById("poiFilterSelect");
  var currentSelectedValue = poiFilterElement.options[poiFilterElement.selectedIndex].value;

  if(currentSelectedValue === 'all') {
    for (var index = 0; index < poiFilterElement.length; index++) {
      optionValue = poiFilterElement.options[index].value;
      poiFilterArray.push(optionValue);
    }
  }
  else {
    poiFilterArray.push(currentSelectedValue);
  }
  return poiFilterArray;
}

function fillOutputFields(centralAddressCoordinates) {
  setCentralCoordinates('midpointCoordinates', centralAddressCoordinates);
  setCentralAddress('midpointAddress', centralAddressCoordinates);
  var radius = document.getElementById('txtRadius').value;
  var filter = getPoiFilters();
  plotPlaces(map, radius, centralAddressCoordinates, filter);
  map.setCenter({lat: centralAddressCoordinates[0], lng: centralAddressCoordinates[1]});
  map.setZoom(12);
}

function addPointOfInterest(infowindowElement) {
  document.getElementById('poi_places').appendChild(infowindowElement);
}

function clearText() {
  document.getElementById('pastein').value = '';
}

function resetOutput() {
  // reset the output midpoint text
  document.getElementById('midpointCoordinates').innerText = '0,0';
  document.getElementById('midpointAddress').innerText = 'No result';
  // reset the places list
  resetPlacesList();
}

function resetPlacesList() {
  var newDefaultPlaceTextHolder = document.createElement("span");
  var newDefaultPlaceText = document.createTextNode("This list has no results");
  newDefaultPlaceTextHolder.appendChild(newDefaultPlaceText);
  $('#poi_places').html(newDefaultPlaceTextHolder);
}

function cleanPlaceList() {
  $('#poi_places').html('');
}

function reset() {
  // empty address select element
  var addressSelectElement = document.getElementById('addressesSelect');
  if(addressSelectElement) {
    fillSelectWithOptionArray(addressSelectElement, null);
  }
  // clear text area from input
  var pasteArea = document.getElementById('pastein');
  if(pasteArea) {
    pasteArea.value = '';
  }
  // hide address select element and show the paste text area
  if(addressSelectElement) {
    toggleElements('pastein', 'addressesSelect');
  }
  // clear map from markers
  setMapOnMarkers(null);
  // reset midpoint POI radius input field
  var pasteArea = document.getElementById('txtRadius').value = 2000;
  // empty the address array and the markers array
  addresses = [];
  markers = [];
  // make all option the default
  document.getElementById("poiFilterSelect").selectedIndex = 0;
  // reset output
  resetOutput();
  // reset map zoom
  map.setCenter(defaultMapOptions.center);
  map.setZoom(defaultMapOptions.zoom);
  //reset element state
  toggleStatusElement('deleteButton', false);
  toggleStatusElement('searchButton', false);
  toggleStatusElement('searchButton', false);
  toggleStatusElement('poiFilterSelect', true);
  toggleStatusElement('txtRadius', true);
  //reset initial for input validation
  initial = true;
}

// function initControls() {
//   initial = true;
//   toggleStatusElement("deleteButton", false);
//   toggleStatusElement('searchButton', false);
//   $('[data-toggle="popover"]').popover();
// }

function isKeyDown(event) {
  var x = event.keyCode;
  if (x < 17 || x > 17) {
    document.getElementById('pastein').value = '';
  } 
}

function toggleStatusElement(elementId, enable) {
  if(enable) {
    document.getElementById(elementId).style.cursor = "default";
    document.getElementById(elementId).disabled = false;
  } else {
    document.getElementById(elementId).style.cursor = "default";
    document.getElementById(elementId).disabled = true;
  }
}

function showMessage() {
  var popcorn = document.querySelector('#pastein');
  var tooltip = document.querySelector('#tooltip');
  Popper.createPopper(popcorn, tooltip, {
    placement: 'left'
  });
}

function resetDelete() {
  // clear map from markers
  setMapOnMarkers(null);
  // empty the address array and the markers array
  addresses = [];
  markers = [];
  // reset output
  resetOutput();
  // reset map zoom
  map.setCenter(defaultMapOptions.center);
  map.setZoom(defaultMapOptions.zoom);
  //reset initial for input validation
  initial = true;
  //reset elements
  toggleStatusElement('searchButton', true);
  toggleStatusElement('poiFilterSelect', true);
  toggleStatusElement('txtRadius', true);
}

function initControls() {
  initial = true;
  toggleStatusElement("deleteButton", false);
  toggleStatusElement('searchButton', false);
  $('[data-toggle="popover"]').popover();
}

function toggleStatusElement(elementId, enable) {
  if(enable) {
    document.getElementById(elementId).style.cursor = "default";
    document.getElementById(elementId).disabled = false;
  } else {
    document.getElementById(elementId).style.cursor = "default";
    document.getElementById(elementId).disabled = true;
  }
}

function showMessage() {
  var popcorn = document.querySelector('#pastein');
  var tooltip = document.querySelector('#tooltip');
  Popper.createPopper(popcorn, tooltip, {
    placement: 'left'
  });
}
/**
 * End of Control functions
 */