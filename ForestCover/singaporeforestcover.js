var ee = require('@google/earthengine');
/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var countries = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017"),
    gfc2020 = ee.Image("UMD/hansen/global_forest_change_2020_v1_8");
/***** End of imports. If edited, may not auto-convert in the playground. *****/


// Comment/uncomment the lists of countries to highlight differences in regional S1 revisit
var aoi = ee.Feature(countries.filter(ee.Filter.inList('country_na',
  // ['Germany', 'Poland', 'Czechia', 'Slovakia', 'Austria', 'Hungary'] // European
  // ['Ethiopia', 'Somalia', 'Kenya'] // Near the Equator
  ['Singapore'] // 12 days revisit, mostly
  )).union().first()).geometry().bounds(); // get bounds to simplify geometry


// Define time period
var startDate = '2021-06-01';
var endDate = '2021-06-16';

// Select S1 IW images in area of interest and time period
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD').
  filterMetadata('instrumentMode', 'equals', 'IW').
  filterBounds(aoi).
  filterDate(startDate, endDate);


var cnt = ee.FeatureCollection(s1).
  // uncomment next line if you want to be specific
  // filterMetadata('orbitProperties_pass', 'equals', 'ASCENDING').
  reduceToImage(['system:index'], ee.Reducer.count());

var upper = cnt.reduceRegion(
  {reducer: ee.Reducer.max(), geometry: aoi, scale: 1000, bestEffort: true}
);

print('Max count:', upper.get('count'));

// Define red to green pseudo color palette
var red2green = ['a50026', 'd73027', 'f46d43', 'fdae61', 'fee08b', 'ffffbf',
  'd9ef8b', 'a6d96a', '66bd63', '1a9850', '006837'];

Map.addLayer(cnt.updateMask(cnt.gt(0)).clip(aoi),
  {min: 1, max: upper.get('count').getInfo(), palette: red2green}, 'All');

Map.centerObject(aoi, 13);

var canopyCover = gfc2020.select(['treecover2000']);

// Canopy cover percentage (e.g. 10%).
var cc = ee.Number(10);
// Minimum forest area in pixels (e.g. 6 pixels, ~ 0.5 ha in this example).
var pixels = ee.Number(6);
// Minimum mapping area for tree loss (usually same as the minimum forest area).
var lossPixels = ee.Number(6);

var canopyCover10 = canopyCover.gte(cc).selfMask();

// Use connectedPixelCount() to get contiguous area.
var contArea = canopyCover10.connectedPixelCount();
// Apply the minimum area requirement.
var minArea = contArea.gte(pixels).selfMask();

var prj = gfc2020.projection();
var scale = prj.nominalScale();
Map.addLayer(minArea.reproject(prj.atScale(scale)), {
    palette: ['#96ED89']
}, 'tree cover: >= min canopy cover & area (dark green)');

var forestArea = minArea.multiply(ee.Image.pixelArea()).divide(10000);
var forestSize = forestArea.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: s1.geometry(),
    scale: 30,
    maxPixels: 1e13
});
print(
    'Year 2000 tree cover (ha) \nmeeting minimum canopy cover and \nforest area thresholds \n ',
    forestSize.get('treecover2000'));
    
var pixelCount = minArea.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: s1.geometry(),
  scale: 30,
  maxPixels: 1e13
});
var onePixel = forestSize.getNumber('treecover2000')
    .divide(pixelCount.getNumber('treecover2000'));
var minAreaUsed = onePixel.multiply(pixels);
print('Minimum forest area used (ha)\n ', minAreaUsed);

var totalLoss = [];
for(var i=1;i<=20;i++){
  var treeLoss = gfc2020.select(['lossyear']);
  var treeLoss = treeLoss.eq(i).selfMask(); // tree loss in year 2001
  // Select the tree loss within the derived tree cover
  // (>= canopy cover and area requirements).
  var lossname = 'loss'+i;
  var treecoverLoss = minArea.and(treeLoss).rename(lossname).selfMask();
  
  // Create connectedPixelCount() to get contiguous area.
  var contLoss = treecoverLoss.connectedPixelCount();
  // Apply the minimum area requirement.
  var minLoss = contLoss.gte(lossPixels).selfMask();
  
  var lossArea = minLoss.multiply(ee.Image.pixelArea()).divide(10000);
  var lossSize = lossArea.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: s1.geometry(),
      scale: 30,
      maxPixels: 1e13
  });
  print(
      'Year '+lossname+' tree loss (ha) \nmeeting minimum canopy cover and \nforest area thresholds \n ',
      lossSize.get(lossname));
  totalLoss.push(lossSize.get(lossname));
}

print(totalLoss);

// var treeLoss = gfc2020.select(['lossyear']);
// var treeLoss01 = treeLoss.eq(1).selfMask(); // tree loss in year 2001
// // Select the tree loss within the derived tree cover
// // (>= canopy cover and area requirements).
// var treecoverLoss01 = minArea.and(treeLoss01).rename('loss2001').selfMask();

// // Create connectedPixelCount() to get contiguous area.
// var contLoss = treecoverLoss01.connectedPixelCount();
// // Apply the minimum area requirement.
// var minLoss = contLoss.gte(lossPixels).selfMask();

// var lossArea = minLoss.multiply(ee.Image.pixelArea()).divide(10000);
// var lossSize = lossArea.reduceRegion({
//     reducer: ee.Reducer.sum(),
//     geometry: s1.geometry(),
//     scale: 30,
//     maxPixels: 1e13
// });
// print(
//     'Year 2001 tree loss (ha) \nmeeting minimum canopy cover and \nforest area thresholds \n ',
//     lossSize.get('loss2001'));
    




// // Unmask the derived loss.
// var minLossUnmask = minLoss.unmask();
// // Switch the binary value of the loss (0, 1) to (1, 0).
// var notLoss = minLossUnmask.select('loss1').eq(0);
// // Combine the derived tree cover and not-loss with 'and'.
// var treecoverLoss01 = minArea.and(notLoss).selfMask();

// var contArea01 = treecoverLoss01.connectedPixelCount();
// var minArea01 = contArea01.gte(pixels);
// Map.addLayer(minArea01.reproject(prj.atScale(scale)), {
//     palette: ['#168039']
// }, 'tree cover 2001 (gain not considered) (light green)');

// var forestArea01 = minArea01.multiply(ee.Image.pixelArea()).divide(10000);
// var forestSize01 = forestArea01.reduceRegion({
//     reducer: ee.Reducer.sum(),
//     geometry: s1.geometry(),
//     scale: 30,
//     maxPixels: 1e13
// });
// print(
//     'Year 2001 tree cover (ha) \nmeeting minimum canopy cover and \nforest area thresholds \n ',
//     forestSize01.get('treecover2000'));