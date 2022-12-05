# Our World in Tweets

Website: https://nicholke.github.io/dataviscourse-pr-Our-World-in-Tweets/

# Project Screencast

Youtube Link: <iframe width="560" height="315" src="https://www.youtube.com/embed/Fhpq2__YXOU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

# Process Book

https://github.com/nicholke/dataviscourse-pr-Our-World-in-Tweets/blob/main/Process%20Book.pdf


# Code
External Sources

*  [Dark BaseMap](https://bl.ocks.org/Xatpy/raw/854297419bd7eb3421d0/) used for the black background on world map
*  [Map Layout](https://www.openstreetmap.org/copyright) used to create world map locations


# Data Source
* Data is pulled from Twitter API and is located in our data folder


# Visualization Features

Global Trending Tweets
* Global trends are represented by a world map and corresponding bubble chart
* World Map contains twitter icons to represent geolocations of tweet, on hover this will display the trending topic.
* World Map will highlight clicked country in blue and update bubble chart with top trending topics for that country.
* Bubble Chart uses popularity (size) to encode the overall popularity of each trending topic.
* Drop down button updates visulization with trending data for the selected date. 


Trending Topics Over Time
* The top 20 trending topics are displayed in colored text and an accompanying line chart. 
* The line chart has trends encoded by color with corresponding day (x-position) and count (y-position).






