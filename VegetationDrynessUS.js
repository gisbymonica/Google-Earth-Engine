/*
Category	Description
Vegetation Dryness : <50 to >200 (Very Dry to Very Moist)
*/

/**
 * 
 * AUTHOR: MONICA MOHAN
 * PURPOSE: To identify the variation in Vegetation Dryness over Western US over time
 * DATA SOURCE: Rao, K., Williams, A.P., Flefil, J.F. & Konings, A.G. (2020). SAR-enhanced mapping
 * of live fuel moisture content. Remote Sensing of Environment, 245, 111797.
 * DOI: 10.1016/j.rse.2020.111797
 * 
**/


var imageCollection = ee.ImageCollection("users/kkraoj/lfm-mapper/lfmc_col_25_may_2021");
var initialPoint = ee.Geometry.Point([-115, 39]);
var vegetation = ee.Image(imageCollection.toList(imageCollection.size()).get(-1))

var dict = {
  "names": [
    "Very Dry",
    "Dry",
    "Moderate",
    "Moist",
    "Very Moist", 
  ],
  "colors": [
    "#703103", 
    "#f1b555", 
    "#66a000",
    "#056201", 
    "#011301"
  ]};

var vis = {min:[50], max:[200], palette:dict['colors']};

var mapPanel = ui.Map();
var layers = mapPanel.layers();
var compositeLayer = ui.Map.Layer(vegetation.visualize(vis)).setName('Vegetation Dryness');
layers.add(compositeLayer, 'Vegetation Dryness');

var inspectorPanel = ui.Panel({style: {width: '40%'}});

var summary = ui.Panel([
  ui.Label({
    value: 'Western US - Vegetation Dryness Percentage',
    style: {fontSize: '20px', fontWeight: 'bold'}
  }),
  ui.Label('Click on any location over Western US to see the leaf moisture percentage of the point as a time series.')
]);
inspectorPanel.add(summary);

var lon = ui.Label();
var lat = ui.Label();
inspectorPanel.add(ui.Panel([lon, lat], ui.Panel.Layout.flow('horizontal')));

var dataSourceLabel = ui.Label('Data Source')
dataSourceLabel.setUrl('https://code.earthengine.google.com/?asset=users/kkraoj/lfm-mapper/lfmc_col_25_may_2021')
var dataSource = ui.Panel([
  dataSourceLabel,
  ui.Label('Rao, K., Williams, A.P., Flefil, J.F. & Konings, A.G. (2020). SAR-enhanced mapping of live fuel moisture content. Remote Sensing of Environment, 245, 111797. DOI: 10.1016/j.rse.2020.111797')
]);
inspectorPanel.add(dataSource);

ui.root.clear();
ui.root.add(ui.SplitPanel(inspectorPanel, mapPanel));

var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px'
  }
});

function addCategoricalLegend(panel, dict, title) {
  
  var legendTitle = ui.Label({
    value: title,
    style: {
      fontWeight: 'bold',
      fontSize: '18px',
      margin: '0 0 4px 0',
      padding: '0'
    }
  });
  panel.add(legendTitle);
  
  var loading = ui.Label('Loading legend...', {margin: '2px 0 4px 0'});
  panel.add(loading);
  
  var makeRow = function(color, name) {
    var colorBox = ui.Label({
      style: {
        backgroundColor: color,
        padding: '8px',
        margin: '0 0 4px 0'
      }
    });
  
    var description = ui.Label({
      value: name,
      style: {margin: '0 0 4px 6px'}
    });
  
    return ui.Panel({
      widgets: [colorBox, description],
      layout: ui.Panel.Layout.Flow('horizontal')
    });
  };
  
  var palette = dict['colors'];
  var names = dict['names'];
  loading.style().set('shown', false);
  
  for (var i = 0; i < names.length; i++) {
    panel.add(makeRow(palette[i], names[i]));
  }
  
  mapPanel.add(panel);
  
}


addCategoricalLegend(legend, dict, 'Western US Vegetation Dryness');


var generateChart = function (coords) {
  
  lon.setValue('Point Longitude: ' + coords.lon.toFixed(2));
  lat.setValue('Point Latitude: ' + coords.lat.toFixed(2));
  
  var point = ee.Feature(ee.Geometry.Point(coords.lon, coords.lat), {label: 'Moisture %'});
  var pointGraphic = ui.Map.Layer(point, {color: '000000'}, 'Selected Location');
  mapPanel.layers().set(1, pointGraphic);
  
  var COLOR = {
    DRYNESS: '66a000'
  };
  var selectedPoint = new ee.FeatureCollection([point]);
  
  var lfmTimeSeries = ui.Chart.image.seriesByRegion({
    imageCollection: imageCollection,
    regions: selectedPoint,
    reducer: ee.Reducer.mean(),
    band: '',
    xProperty: 'system:time_start',
    seriesProperty: 'label'
  });
  lfmTimeSeries.setChartType('ColumnChart');
  lfmTimeSeries.setOptions({
    title: 'Vegetation Dryness Over Time',
    vAxis: {
      title: 'Leaf Moisture %'
    },
    lineWidth: 2,
    series: {
      0: {color: COLOR.DRYNESS},
    }
  });
  inspectorPanel.widgets().set(3, lfmTimeSeries);
}

mapPanel.onClick(generateChart);
mapPanel.style().set('cursor', 'crosshair');
mapPanel.centerObject(initialPoint, 5);
generateChart({
  lon: initialPoint.coordinates().get(0).getInfo(),
  lat: initialPoint.coordinates().get(1).getInfo()
});
