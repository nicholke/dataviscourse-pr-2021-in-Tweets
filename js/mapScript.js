async function loadData() {
    const countriesData = await d3.csv('data/countries.csv');
    const countriesShapes = await d3.json('data/countries_borders.geojson');
    const twitterData = await d3.json('data/twitter.json');
    const dailyData = await d3.csv('data/everydayData/trendsDay.csv');
    const hourlyData = await d3.csv('data/everydayData/trendsHour.csv');
    return {countriesData, countriesShapes, twitterData, dailyData, hourlyData};
}

const globalApplicationState = {
    selectedTrends: ['Grammy', 'Pokémon', 'Senate'],
    selectedLocation: null,
    selectedDate: '11-09-2022',
    byHour: false
};

loadData().then((loadedData) => {
    this.simulation = d3.forceSimulation();

    this.map = L.map('map', {
        minZoom: 2,
        maxZoom: 4,
        zoomControl: false,
        maxBounds: [[-90, -180], [90, 180]]
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
                if (globalApplicationState.selectedLocation !== feature.properties.ADMIN)
                    e.target.setStyle({
                        weight: 2,
                        color: '#1DA1F2',
                        dashArray: '10',
                        opacity: .5
                    })
            },
            mouseout: (e) => {
                if (globalApplicationState.selectedLocation !== feature.properties.ADMIN) selectionLayer.resetStyle(e.target)
            },
            click: (e) => {
                if (globalApplicationState.selectedLocation === feature.properties.ADMIN) {
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


    selectionLayer = L.geoJson(loadedData.countriesShapes, {
        style: {
            weight: 2,
            opacity: 0,
            color: 'black',
            dashArray: '3',
            fillOpacity: 0
        }, onEachFeature: selectCountry
    }).addTo(map);

    let twitterIcon = L.icon({
        iconUrl: 'assets/twitter_icon.png',
        iconSize: [40, 40],
        iconAnchor: [35, 12]
    })

    document.getElementById('tweet-dates').addEventListener('change', function(e) {
        console.log(document.getElementById('tweet-dates').value);
        let selectedDate = new Date(document.getElementById('tweet-dates').value);
        selectedDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * -60000)
        globalApplicationState.selectedDate = selectedDate.toLocaleDateString('en-US',
            {year: 'numeric', month: '2-digit', day: '2-digit'});
        globalApplicationState.selectedDate = globalApplicationState.selectedDate.replaceAll('/', '-');
        console.log(globalApplicationState.selectedDate);

        markCountryTopTrend(loadedData, twitterIcon);
        drawBubbleChart(loadedData);
        d3.select("#date-label").text(selectedDate.toLocaleDateString('en-US',
            {year: 'numeric', month: '2-digit', day: '2-digit'}));
    });



    markCountryTopTrend(loadedData, twitterIcon);
    drawBubbleChart(loadedData);
    drawLineChart(loadedData);
});


function markCountryTopTrend(data, icon) {
    let tweetsByCountry = data.twitterData.filter(x => x.date === globalApplicationState.selectedDate)[0]['value'];
    console.log(tweetsByCountry);

    for (let c of data.countriesData) {
        let t = tweetsByCountry.filter(x => x.name === c.name);
        if (!t.length) continue;

        let trends = t[0].twitterTrends;
        let topTrend = d3.maxIndex(trends, x => x.tweet_volume);

        L.marker([c.latitude, c.longitude], {icon: icon})
            .bindTooltip(c.name + '<br>Top trend: ' + trends[topTrend].name,
                {
                    permanent: false,
                    direction: 'right'
                }
            ).addTo(this.map);
    }
}

function drawBubbleChart(data) {

    let tweetsByCountry = data.twitterData.filter(x => x.date === globalApplicationState.selectedDate)[0]['value'];
    let t;

    if (globalApplicationState.selectedLocation === null) {
        t = tweetsByCountry.filter(x => x.name === 'world');
        d3.select("#country-label").text('The entire world')
        console.log(t);
    } else {
        t = tweetsByCountry.filter(x => globalApplicationState.selectedLocation.includes(x.name));
        d3.select("#country-label").text(globalApplicationState.selectedLocation)
    }

    if (t.length > 0) {
        t = t[0]['twitterTrends'];
        d3.select("#top-trend-label").text(t[d3.maxIndex(t, d => d.tweet_volume)].name);
    } else {
        t = [{'name':`The Twitter API gave us no data on ${globalApplicationState.selectedLocation} :(`}];
        d3.select("#country-label").text(globalApplicationState.selectedLocation);
        d3.select("#top-trend-label").text('...we don\'t really know...');
    }


    let biggestBubbleScale = d3.max(t, d => d.tweet_volume);

    let bubbleScale = d3.scaleSqrt()
        .domain([0, biggestBubbleScale])
        .range([1, 75]);

    let bubbleChartSelection = d3.select('#content').select('#bubble-chart')
        .selectAll('g')
        .data(t)
        .join('g')
        .attr('class', 'bubble');

    bubbleChartSelection.selectAll('circle').remove();
    bubbleChartSelection.selectAll('text').remove();

    let div = d3.select("body").select(".tooltip")
        .style("opacity", 0);

    bubbleChartSelection.append('circle')
        .attr('r', d => bubbleScale(d.tweet_volume))
        .attr('fill', '#1DA1F2')
        .attr('class', 'tweet-node')
        .on('click', function (e, d) {
            console.log(d)
            window.open(
                d.url
            );
        })
        .on("mouseover", function (e, d) {
            let matrix = this.getScreenCTM()
                .translate(+ this.getAttribute("cx"), + this.getAttribute("cy"));
            let radius = +this.getAttribute('r');
            div.transition()
                .duration(200)
                .style("opacity", 1);
            div.html(d.name + "<br/>" + "<span style='color: #1DA1F2'>"+d.tweet_volume+"</span>"+" tweets")
                .style("left", ((window.scrollX + matrix.e + radius-30)) + "px")
                .style("top", (window.scrollY + matrix.f + 30) + "px");
        })
        .on("mouseout", function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });
    ;

    this.simulation.stop();

    this.simulation = d3.forceSimulation().nodes(t)
        .force("charge", d3.forceManyBody().strength(10))
        .force("center", d3.forceCenter(700 / 2, 500 / 2))
        .force('collision', d3.forceCollide().radius(function (d) {
            return bubbleScale(d.tweet_volume)
        }))
        .on('tick', ticked);

    function ticked() {
        t.forEach(function (d) {
            d.x = Math.max(50, Math.min(700 - 100, d.x))
            d.y = Math.max(50, Math.min(500 - 100, d.y))
        })
        bubbleChartSelection.attr('transform', d => `translate(${d.x}, ${d.y})`);
    }

    bubbleChartSelection.append('text').text(d => d.name)
        .style('text-anchor', 'middle')
        .style('font-size', d => bubbleScale(d.tweet_volume) / 5);
}

function drawLineChart(data) {
   let trendNames = data.dailyData.map(x => x.name);
   console.log(trendNames);

    // d3.select("#trends-buttons")
    //     .each(function(d) {




   this.colorScale = d3.scaleOrdinal()
       .domain(trendNames)
       .range(['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
           '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
           '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
           '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffffff', '#3A3B3C']);


    for (let i = 1; i <= trendNames.length; i++) {
        d3.select("#trend-buttons")
            .append('div')
            .style('text-align', 'center')
            .append("button")
            .attr("type", "button")
            .attr("class", "trend-item")
            .attr("id", 'button-'+i)
            .style('margin', '0 auto')
            .append("div")
            .attr("class", "label")
            .attr('id', 'label-' + i)
            .text(i + '. ' + trendNames[i-1])
            .on('click', () => {
                    if(globalApplicationState.selectedTrends.includes(trendNames[i-1])) {
                        d3.select('#label-' + i).style('color', 'white');
                        globalApplicationState
                            .selectedTrends
                            .splice(globalApplicationState.selectedTrends.indexOf(trendNames[i-1]), 1);
                    } else {
                        d3.select('#label-' + i).style('color', this.colorScale(trendNames[i-1]));
                        globalApplicationState.selectedTrends.push(trendNames[i-1]);
                    }
                    updateSelectedTrends(data);
                }
            )
            .on('mouseover', () => {
                d3.select('#label-' + i).style('color', '#1DA1F2');
            })
            .on('mouseout', () =>
            {
                if(globalApplicationState.selectedTrends.includes(trendNames[i-1])) {
                    d3.select('#label-' + i).style('color', this.colorScale(trendNames[i-1]));

                } else {
                    d3.select('#label-' + i).style('color', 'white');
                }
            }
            );
    }

    for(let t of globalApplicationState.selectedTrends) {
        d3.select('#label-' + (trendNames.indexOf(t) + 1)).style('color', this.colorScale(t));
    }

    this.days = Object.keys(data.dailyData[0]).filter(x => x.includes('11-'));
    this.days = this.days.map(x => new Date(new Date(x +'-2022').getTime() - new Date(x+'-2022').getTimezoneOffset() * -60000));

    this.hours = Object.keys(data.hourlyData[0]).filter(x => x.includes('2022-11'));
    this.hours = this.hours.map(x => new Date(x));

    console.log('hours', this.hours);

    this.xAxis = d3.scaleTime()
        .domain(d3.extent(days))
        .range([0, 1100]);

    d3.select('#x-axis')
        .append('g')
        .attr('transform', `translate(${100}, ${500})`)
        .call(d3.axisBottom(this.xAxis)
            .tickFormat(d3.timeFormat('%b %d'))
        );

    d3.select('#x-axis')
        .append('text')
        .text('November 2022')
        .attr('x', 650)
        .attr('y', 560)
        .style('font-size', '20px')
        .style('text-anchor', 'middle')
        .style('fill', 'white');

    // Add y axis
    this.yAxis = d3.scaleLinear()
        .domain([0, 1000])
        .range([500, 10])
        .nice();

    d3.select('#y-axis')
        .append('g')
        .attr('transform', `translate(100,0)`)
        .call(d3.axisLeft(this.yAxis));

    // Append y axis text
    d3.select('#y-axis')
        .append('text')
        .text('Trend')
        .attr('x', -250)
        .attr('y', 25)
        .attr('transform', 'rotate(-90)')
        .style('font-size', '20px')
        .style('text-anchor', 'middle')
        .style('fill', 'white');

    //  let timeSeriesDaily = data.dailyData.filter((row) => row..includes('OWID'));
    // Add an interaction for the x position over the lines
    d3.select('#line-chart').on('mousemove', (event) => {
        const svgEdge = d3.select('#line-chart').node().getBoundingClientRect().x;
        const distanceFromSVGEdge = event.clientX - svgEdge;

        if (distanceFromSVGEdge > 100 && distanceFromSVGEdge < 1200) {
            // Set the line position
            d3.select('#line-chart')
                .select('#overlay')
                .select('line')
                .attr('stroke', '#1DA1F2')
                .attr('stroke-dasharray', '10')
                .attr('x1', distanceFromSVGEdge)
                .attr('x2', distanceFromSVGEdge)
                .attr('y1', 500)
                .attr('y2', 0)
                .style('opacity', 0.5);

            // Find the relevant data (by date and location)
            const dateHovered = this.xAxis.invert(distanceFromSVGEdge - 60).toISOString().substring(0, 10);
            let filteredData = data.dailyData
                .filter((row) => (
                        (globalApplicationState.selectedTrends.length > 0 &&
                            globalApplicationState.selectedTrends.includes(row.name))
                ));

            let collectedTrends = [];
            for(let f of filteredData) {
                let name = f.name;
                var output = Object.entries(f).map(([date, volume]) => ({
                    date,
                    volume
                }));

                output.forEach(x => {
                    x.name = name;
                    x.date = new Date(new Date(x.date + '-2022').getTime() -
                        new Date(x.date + '-2022').getTimezoneOffset() * -60000);
                    x.volume = +x.volume;
                });

                output = output.filter(x => !Number.isNaN(x.volume));
                collectedTrends.push(output);
            }
            console.log(collectedTrends);
            filteredData = collectedTrends.map(d => d.filter(x => x.date.toDateString() === new Date(dateHovered).toDateString()));
            console.log(filteredData);
          //  collectedTrends.filter(x => )
            filteredData = filteredData.flat();
            filteredData
                .sort((rowA, rowB) => rowB.volume - rowA.volume);

            // Remove any existing text
            d3.select('#line-chart')
                .select('#overlay')
                .selectAll('text')
                .remove();

            // Add text to the SVG
            d3.select('#line-chart')
                .select('#overlay')
                .selectAll('text')
                .data(filteredData)
                .join('text')
                .text((d) => `${d.name} - ${d3.format(".2s")(d.volume)} tweets`)
                // .attr('x', distanceFromSVGEdge > 500 ? distanceFromSVGEdge - 200 : distanceFromSVGEdge + 5)
                .attr('x', distanceFromSVGEdge > 500 ? distanceFromSVGEdge - 5 : distanceFromSVGEdge + 5)
                .attr('text-anchor', distanceFromSVGEdge > 500 ? 'end' : 'start')
                .attr('y', (d, i) => (i + 1) * 20)
                .attr('fill', (d) => this.colorScale(d.name));
        }
    });

    updateSelectedTrends(data);
}

function updateSelectedTrends (data) {
    // -------------------- BEGIN CUT ---------------------
    // Clear the existing lines
    d3
        .select('#lines')
        .html('');

    // Get the data for the new line from the global state
    const selectedTrends = data.dailyData.filter(x => globalApplicationState.selectedTrends.includes(x.name));

    // Use d3 group to get the line data in groups
    const groupedData = d3.group(selectedTrends, d => d.name);

    let values = [...selectedTrends].map(x => Object.values(x));

    let selectedVolumes = [];
    for(let row of values) {
        for(let value of row) {
            selectedVolumes.push(+value);
        }
    }
    selectedVolumes = selectedVolumes.filter(x => !Number.isNaN(x));
    console.log(groupedData);

    // Update the y-axis
    this.yAxis.domain([0, Math.max(...selectedVolumes)]);

    d3.select('#line-chart')
        .select('#y-axis')
        .select('g')
        .call(d3.axisLeft(this.yAxis));

    // // Draw the new line
        d3.select('#line-chart')
            .select('#lines')
            .selectAll('.line')
            .data(groupedData)
            .join('path')
            .attr('fill', 'none')
            .attr('stroke', ([key, values]) => this.colorScale(key))
            .attr('stroke-width', 1)
            .attr('d', ([trend, values])  => {
                console.log(trend);
                console.log('sauce', values);
                var output = Object.entries(values[0]).map(([date, volume]) => ({
                    date,
                    volume}));

                output.forEach(x => {
                    x.date = new Date(new Date(x.date +'-2022').getTime() -
                    new Date(x.date+'-2022').getTimezoneOffset() * -60000);
                    x.volume = +x.volume;
                });

                output = output.filter(x => !Number.isNaN(x.volume));

                return d3.line()
                    .x(d => this.xAxis(d.date) + 100)
                    .y(d => this.yAxis(d.volume))
                    (output);
            });



    //
    // // Clear overlay
    // this.svg
    //     .select('#overlay')
    //     .selectAll('text')
    //     .remove();
    //
    // this.svg
    //     .select('#overlay')
    //     .select('line')
    //     .attr('stroke', 'none');

    // -------------------- END CUT ---------------------

}