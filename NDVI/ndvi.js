/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var S2_SR = ee.ImageCollection("COPERNICUS/S2_SR"),
    geometry = 
    /* color: #98ff00 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[78.11140090626755, 11.644575414294891],
          [78.11140090626755, 11.642810061212579],
          [78.11393827599564, 11.642810061212579],
          [78.11393827599564, 11.644575414294891]]], null, false),
    polygon = /* color: #ffc82d */ee.Geometry.Polygon(
        [[[79.19247773575366, 10.762142941372398],
          [79.1924670069176, 10.760561918491836],
          [79.19436601090014, 10.76060407920959],
          [79.19441965508044, 10.76240644437966]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/

var aoi = S2_SR.filterBounds(polygon).filterDate('2021-01-01', '2021-02-01');

Map.centerObject(polygon);

var addNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
};

var S2_NDVI = aoi.map(addNDVI);

var recent_S2 = ee.Image(S2_NDVI.sort('system:time_start', false).first());

print('Recent image: ', recent_S2);

var NDVIpalette = ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901', '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01', '012E01', '011D01', '011301'];

Map.addLayer(recent_S2.select('NDVI'), {palette: NDVIpalette}, 'Recent Sentinel NDVI');

// Reduce the region. The region parameter is the Feature geometry.
var meanDictionary = recent_S2.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: polygon,
  scale: 30,
  maxPixels: 1e9
});

// The result is a Dictionary.  Print it.
print(meanDictionary);