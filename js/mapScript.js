async function loadData () {
  const countriesData = await d3.csv('data/countries.csv');
  const countriesShapes = await d3.json('data/countries_borders.geojson');
  const twitterData = await d3.json('data/twitter.json');
  return { countriesData, countriesShapes, twitterData };
}

const globalApplicationState = {
  selectedLocation: null
};

loadData().then((loadedData) => {
var map = L.map('map', {
    minZoom: 2,
    maxZoom: 4,
    zoomControl: false,
    maxBounds: [[-90,-180],   [90,180]]
})
  .setView([51.505, -0.09], 2);

var CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

let selectionLayer;

let selectCountry = function onEachFeature(feature, layer) {
    layer.on({
        mouseover: (e) => {
            if(globalApplicationState.selectedLocation!== feature.properties.ADMIN)
            e.target.setStyle({
            weight: 2,
            color: '#1DA1F2',
            dashArray: '10',
            opacity: .5
        })},
        mouseout: (e) => {if(globalApplicationState.selectedLocation!== feature.properties.ADMIN) selectionLayer.resetStyle(e.target)},
        click: (e) => {
            if(globalApplicationState.selectedLocation === feature.properties.ADMIN)
            {
                globalApplicationState.selectedLocation = null;
                e.target.setStyle({
                    weight: 2,
                    color: '#1DA1F2',
                    dashArray: '10',
                    opacity: .5,
                    fillOpacity: 0
                })
                drawBubbleChart(loadedData);
                return;
            }
            selectionLayer.resetStyle();
            globalApplicationState.selectedLocation = feature.properties.ADMIN;

            e.target.setStyle({
            weight: 2,
            color: '#1DA1F2',
            dashArray: '',
            opacity: 1,
            fillOpacity: .1
        });
            drawBubbleChart(loadedData);
        }
    });
}

selectionLayer = L.geoJson(loadedData.countriesShapes, {style:{
            weight: 2,
            opacity: 0,
            color: 'black',
            dashArray: '3',
            fillOpacity: 0
    }, onEachFeature: selectCountry}).addTo(map);

var twitterIcon = L.icon({
  iconUrl: 'assets/twitter_icon.png',
  iconSize: [40, 40],
  iconAnchor: [35, 12]
})

let tweetsByCountry = loadedData.twitterData['11-09-2022'];

for(let c of loadedData.countriesData) {
    let t  = tweetsByCountry.filter(x => x.name === c.name);
    if(!t.length) continue;

    let trends = t[0].twitterTrends;
    let topTrend = d3.maxIndex(trends, x => x.tweet_volume);

    L.marker([c.latitude, c.longitude], {icon: twitterIcon})
        .bindTooltip(c.name + '<br>Top trend: ' + trends[topTrend].name,
            {
                permanent: false,
                direction: 'right'
            }
        ).addTo(map);
}
});


function drawBubbleChart(data) {
    let tweetsByCountry = data.twitterData['11-09-2022'];
    let t;

    if (globalApplicationState.selectedLocation === null){
        t = [];
    } else {
        t = tweetsByCountry.filter(x => globalApplicationState.selectedLocation.includes(x.name));
    }


    if (t.length > 0) {
        t = t[0]['twitterTrends'];
    }
    let bubbleChartSelection = d3.select('#content').select('#bubble-chart')
        .selectAll('g')
        .data(t)
        .join('g')
        .attr('transform', d => `translate(${Math.floor(Math.random() * 500)+100}, ${Math.floor(Math.random() * 300)+100})`);

    bubbleChartSelection.append('circle')
        .attr('r', 20)
        .attr('fill', '#1DA1F2');

    bubbleChartSelection.append('text').text(d => d.name);
}