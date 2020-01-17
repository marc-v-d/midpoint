const key = 'AIzaSyBdLsVRrzPRAwRCiTSQtG0L1S3Z1bnnB-Y';
const defaultMapLocation = 'The Netherlands';
const mapId = 'map';
const statusMessageId = 'statusMessage';
const addressesSelectId = 'addressesSelect';
const deleteButtonId = 'deleteButton';
const searchButtonId = 'searchButton';
const resetButtonId = 'resetButton';
const midpointCoordinatesId = "midpointCoordinates";
const midpointAddressId = "midpointAddress";
const select_option_value_all = 'all';
const zoom_default = 8;
const zoom_in_location = 12;

var map;
var placesService;
var markers = [];
var nearbyPlaceMarkers = [];
var centralpointMarker;

const Status = {
    INPUT_READY: 1,
    ANALYZE: 2,
    INVALID_INPUT: 3,
    VALID_INPUT: 4,
    CENTRALPOINT_CALCULATED: 5,
    DELETE_ADDRESS: 6
  }
const ResponseStatus = {
    OK: 1,
    ERROR: 2
}

/**
 * Initialize mathods
 */
function init() {
    initControls();
    initOutput();
    setStatus(Status.INPUT_READY);
}

function initControls() {
    $('[data-toggle="popover"]').popover();
    $('#pastein').on('paste', function(event) {
        $('#pastein').on('input', function() {
            generateInputMultipleSelectV2();
            plotInputAddressesV2();
            $('#pastein').off('input');
        })
    });
}

function initMap() {
    let status = geocoding(defaultMapLocation, resetMap);
}

/**
* This is the method to get the coordinates from a given address.
 * @param {string} address The address to get the coordinates from.  
 * @param {function} location The given function gets executed after executing the request and getting the response back from Google Maps.
 */
function geocoding(address, location) {
    setStatus(Status.ANALYZE);
    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${key}`;
    fetch(url)
    .then(response => response.json())
    .then(data => {
        if(data.status == "OK") {
            //console.log(data.results[0].geometry.location);
            location(data.results[0].geometry.location);
            return ResponseStatus.OK;
        } else {
            console.warn('Error executing geocoding with Google Maps API.');
            resetV2();
            setStatus(Status.INVALID_INPUT);
            location(new google.maps.LatLng(0, 0));
            return ResponseStatus.ERROR;
        }
    })
    .catch(err => console.warn(err.message));
}

function ReverseGeocoding(latitude, longtitude, output) {
    let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longtitude}&key=${key}`;
    fetch(url)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        if(data.status == "OK") {
            output(data);
        }
    })
    .catch(err => console.warn(err.message));
}

/**
 * This function brings the map back to the default values
 */
function resetMap(location) {
    let options = {
        zoom: zoom_default,
        center: location,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById(mapId), options);
    placesService = new google.maps.places.PlacesService(map);
}

/**
 * Plot the addresses from the input.
 */
function plotInputAddressesV2() {
    var addresses = getAddressesFromSelectV2();
    addresses.forEach(plotAddressV2);
    //console.log(addresses);
}

function plotAddressV2(address) {
    let status = geocoding(address, plotCoordinates);
    if(status == ResponseStatus.ERROR) {
        resetV2();
        setStatus(Status.INVALID_INPUT);
        return;
    } else {
        setStatus(Status.SEARCH_READY);
    }
}

function plotCoordinates(location) {
    //console.log(location);
    let marker = new google.maps.Marker({
        map: map,
        position: location,
        icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
        }
    });
    marker.setVisible(false);
    markers.push(marker);
}

function search() {
    if(nearbyPlaceMarkers) {
        clearMarkers(nearbyPlaceMarkers);
    }
    if(centralpointMarker) {
        centralpointMarker.setMap(null);
    }

    initPlacesListV2();
    let location = plotCentralLocation();
    setStatus(Status.CENTRALPOINT_CALCULATED);
    getCentralLocationOutput(location);
    let radius = getRadius();
    let filters = getPoiFiltersV2();
    nearbySearch(location, radius, filters);
    map.setCenter(new google.maps.LatLng(location[0], location[1]));
    map.setZoom(12);
    showMarkers();
}

function getPoiFiltersV2() {
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

function getRadius() {
    var radius = document.getElementById('txtRadius').value;
    return radius;
}

function getCentralLocationOutput(location) {
    ReverseGeocoding(location[0],location[1],setCentralLocationOutput);
}

function plotCentralLocation() {
    let positions = collectPositions();
    let location = calculateCentralPointV2(positions);
    let marker = new google.maps.Marker({
        map: map,
        position: new google.maps.LatLng(location[0], location[1]),
        icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
        }
    });
    centralpointMarker = marker;
    return location;
}

function deleteAddressV2() {
    clearMarkers(markers);
    clearMarkers(nearbyPlaceMarkers);
    centralpointMarker.setMap(null);
    deleteSelectOption(addressesSelectId);
    plotInputAddressesV2();
    initMap();
    setStatus(Status.DELETE_ADDRESS);
}

function clearMarkers(markers) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
    markers = [];
}

/**
 * This function returns the addresses from the input as an array.
 */
function getAddressesFromSelectV2() {
    let addresses = [];
    let addressesElement = document.getElementById(addressesSelectId);
    if(addressesElement) {
        for (let index = 0; index < addressesElement.length; index++) {
            let address = addressesElement.options[index].value;
            addresses.push(address);
        }
    }
    return addresses;
}

function generateInputMultipleSelectV2() {
    let cells = getAddressesFromInputV2();
    let addresses = createMultipleSelectV2(addressesSelectId);
    let options = convertStringArrayToOptionArrayV2(cells);
    addresses = fillSelectWithOptionArrayV2(addresses, options);
    $('#excel_table').html(addresses);
    toggleElementsV2('pastein', addressesSelectId);
}

function getAddressesFromInputV2() {
    let data = removeExtraTabsV2($('#pastein').val());
    let rows = data.split("\n");
    let cells = extractCellsFromRowsV2(rows);
    let uniqueValues = removeDuplicates(cells);
    return uniqueValues;
}

function removeDuplicates(collection) {
    let uniqueValues = [];
    let size = collection.length;
    for(let i = 0; i < size; i++) {
        if(uniqueValues.indexOf(collection[i]) === -1) {
            uniqueValues.push(collection[i]);
        }
    }
    return uniqueValues;
}

function removeExtraTabsV2(string) {
    return string.replace(new RegExp("\t\t", 'g'), "\t");
}

function extractCellsFromRowsV2(rowArray)
{
  let cells = [];
  for (let index in rowArray) {
    cells.push(removeExtraTabs(rowArray[index]));
  }
  return cells;
}

function createMultipleSelectV2(id) {
    var newSelect = document.createElement("select");
    newSelect.id = id;
    newSelect.multiple = true;
    newSelect.className = 'form-control rounded-0';
    newSelect.size = 8;
    return newSelect;
}

function convertStringArrayToOptionArrayV2(stringArray) {
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

function fillSelectWithOptionArrayV2(selectElement, optionArray) {
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

function toggleElementsV2(elementIdDefaultShow, elementIdDefaultHidden) {
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

/**
 * This method deletes the selected option from the given select element.
 * @param {selectId} selectId The ElementId from the select to remove an option from
 */
function deleteSelectOption(selectId) {
    var givenSelect = document.getElementById(selectId);
    if(givenSelect) {
        let index = givenSelect.selectedIndex;
        if(index) {
            givenSelect.remove(givenSelect.selectedIndex);
        }
    }
}

function collectPositions() {
    let positions = [];
    for(let index in markers) {
      let marker = markers[index];
      if(marker !== null)
      {
        positions.push(marker.position);
      }
    }
    return positions;
}

/**
 * @param latLngInDeg array of position objects with latitude and longtitude
 *
 * @return array with the center latitude longtitude pairs in 
 *   degrees.
 */
function calculateCentralPointV2(latLngInDegr) {
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
  
      for (let i=0; i<latLngInDegr.length; i++) {
          let lat = degr2rad(latLngInDegr[i].lat());
          let lng = degr2rad(latLngInDegr[i].lng());
          // sum of cartesian coordinates
          sumX += Math.cos(lat) * Math.cos(lng);
          sumY += Math.cos(lat) * Math.sin(lng);
          sumZ += Math.sin(lat);
      }
  
      let avgX = sumX / latLngInDegr.length;
      let avgY = sumY / latLngInDegr.length;
      let avgZ = sumZ / latLngInDegr.length;
  
      // convert average x, y, z coordinate to latitude and longtitude
      let lng = Math.atan2(avgY, avgX);
      let hyp = Math.sqrt(avgX * avgX + avgY * avgY);
      let lat = Math.atan2(avgZ, hyp);
  
      return ([rad2degr(lat), rad2degr(lng)]);
}
  
function rad2degr(rad) { return rad * 180 / Math.PI; }
function degr2rad(degr) { return degr * Math.PI / 180; }

function showMarkers() {
    markers.forEach(x => x.setVisible(true));
}

function setStatus(status) {
    let message = '';
    switch(status) {
        case Status.INPUT_READY:
            message = 'Ready for input';
            toggleStatusElementV2(deleteButtonId, false);
            toggleStatusElementV2(resetButtonId, true);
            toggleStatusElement(searchButtonId, false);
          break;
        case Status.ANALYZE:
            message = 'Analyzing input';
            toggleStatusElementV2(deleteButtonId, false);
            toggleStatusElementV2(resetButtonId, false);
            toggleStatusElement(searchButtonId, false);
            break;
        case Status.INVALID_INPUT:
            message = 'Input was not valid';
            toggleStatusElementV2(deleteButtonId, false);
            toggleStatusElementV2(resetButtonId, true);
            toggleStatusElement(searchButtonId, false);
            break;
        case Status.SEARCH_READY:
            message = 'Input is valid';
            toggleStatusElementV2(deleteButtonId, true);
            toggleStatusElementV2(resetButtonId, true);
            toggleStatusElement(searchButtonId, true);
            break;
        case Status.CENTRALPOINT_CALCULATED:
            message = 'Midpoint is calculated';
            $(".popover").popover('hide');
            toggleStatusElementV2(deleteButtonId, true);
            toggleStatusElementV2(resetButtonId, true);
            toggleStatusElement(searchButtonId, true);
            break;
        case Status.DELETE_ADDRESS:
            $(".popover").popover('hide');
            message = 'Address is removed and input is valid to recalculate the midpoint';
            toggleStatusElement(searchButtonId, true);
            break;
    }
    disableDeleteButtonValidation();
    document.getElementById(statusMessageId).innerText = message;
}

function disableDeleteButtonValidation() {
    let addresses = getAddressesFromSelectV2();
    if(addresses) {
        if(addresses.length <= 1) {
            $(".popover").popover('hide');
            toggleStatusElementV2(deleteButtonId, false);
        }
    }
}

function resetV2() {
    markers = [];
    initControls();
    initMap();
    // reset status message
    setStatus(Status.INPUT_READY);
    // empty address select element
    var addressSelectElement = document.getElementById(addressesSelectId);
    if(addressSelectElement) {
        fillSelectWithOptionArrayV2(addressSelectElement, null);
    }
    // clear text area from input
    var pasteArea = document.getElementById('pastein');
    if(pasteArea) {
        pasteArea.value = '';
    }
    // hide address select element and show the paste text area
    if(addressSelectElement) {
        toggleElementsV2('pastein', addressesSelectId);
    }
    // reset midpoint POI radius input field
    var pasteArea = document.getElementById('txtRadius').value = 2000;
    // make the "All" option the default
    document.getElementById("poiFilterSelect").selectedIndex = 0;
    // reset output
    initOutput();
    //reset element state
    toggleStatusElement(resetButtonId, true);
    
}

function initOutput() {
    // reset the output midpoint text
    document.getElementById('midpointCoordinates').innerText = '0,0';
    document.getElementById('midpointAddress').innerText = 'No result';
    // reset the places list
    initPlacesListV2();
}

function nearbySearch(location, radius, typeFilters) {
    let request = {
        location: new google.maps.LatLng(location[0], location[1]),
        radius: radius,
        type: typeFilters
    };
    placesService.nearbySearch(request, getNearbyPlacesCallback);
}

function getNearbyPlacesCallback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        if(results.length > 0) {
            cleanPlaceListV2();
        }
        for (var i = 0; i < results.length; i++) {
            getNearbyPlaceDetails(results[i]);
        }
    }
}

function getNearbyPlaceDetails(place) {
    placesService.getDetails({placeId: place.place_id}, plotNearbyPlaceDetails);
}

function plotNearbyPlaceDetails(place, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        var infowindowElement = createInfoWindowContentV2(place);
        addPointOfInterestV2(infowindowElement);
        var marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
            icon: {
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            }
        });
        google.maps.event.addListener(marker, 'click', function() {
            var infowindow = new google.maps.InfoWindow({
                content: infowindowElement.innerHTML
            });
            infowindow.open(map, this);
        });
        nearbyPlaceMarkers.push(marker);
    }
}

function addPointOfInterestV2(infowindowElement) {
    if(infowindowElement) {
        document.getElementById('poi_places').appendChild(infowindowElement);
    }
}

function createInfoWindowContentV2(place) {
    var div = document.createElement("div");
    var strong = document.createElement("strong");
    var breakline_1 = document.createElement("br");
    var breakline_2 = document.createElement("br");
    var breakline_3 = document.createElement("br");
    var placeName = document.createTextNode(place.name);
    var placeId = document.createTextNode('Place identifier: '.concat(place.place_id));
    var placeAddress = document.createTextNode('Address: '.concat(place.formatted_address));
    var placePhoneNumber = document.createTextNode('Phone:'.concat(place.formatted_phone_number));
  
    strong.appendChild(placeName);
    div.appendChild(strong);
    var paragraph = document.createElement("p");
    paragraph.appendChild(placeId);
    paragraph.appendChild(breakline_1);
    paragraph.appendChild(placeAddress);
    paragraph.appendChild(breakline_2);
    paragraph.appendChild(placePhoneNumber);
    paragraph.appendChild(breakline_3);
  
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

function initPlacesListV2() {
    let newDefaultPlaceTextHolder = document.createElement("span");
    let newDefaultPlaceText = document.createTextNode("This list has no results");
    newDefaultPlaceTextHolder.append(newDefaultPlaceText);
    $('#poi_places').html(newDefaultPlaceTextHolder);
}

function cleanPlaceListV2() {
    $('#poi_places').html('');
}

function toggleStatusElementV2(elementId, enable) {
    if(enable) {
      document.getElementById(elementId).style.cursor = "default";
      document.getElementById(elementId).disabled = false;
    } else {
      document.getElementById(elementId).style.cursor = "default";
      document.getElementById(elementId).disabled = true;
    }
}

function setCentralLocationOutput(data) {
    if(data) {
        let address = data.results[0].formatted_address;
        let coordinates = `${data.results[0].geometry.location.lat},${data.results[0].geometry.location.lng}`;
        document.getElementById(midpointAddressId).innerText = address;
        document.getElementById(midpointCoordinatesId).innerText = coordinates;
    }
}

 /**
 * This function returns the current year.
 */
function getCurrentYear(id) {
    var currentDate = new Date();
    var currentYear = currentDate.getFullYear();
    document.getElementById(id).innerText = currentYear;
  }

function test2() {
    // test geocoding
    var result = geocoding('The Netherlands', function(location, responseStatus) {
        console.info(`coordinates: lat = ${location.lat}, lng = ${location.lng}, status = ${responseStatus}`);
    });

    // var t = ['lol','op','lop','lol','i','op']
    // let w = removeDuplicates(t);
    // console.log(w);
}