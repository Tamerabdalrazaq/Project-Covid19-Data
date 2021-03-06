var ctx = document.getElementById('myChart').getContext('2d');
var chart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'confirmed',
            backgroundColor: '#222',
            borderColor: 'rgb(255, 99, 132)',
            data: [0,0,0],
        }]
    },
    options: {}
});

// Global Variables
const myProxy = 'https://api.codetabs.com/v1/proxy?quest='; 
let continents = ['africa','americas','asia','europe', 'global'];
let viewedCountries = []; // All countries in the bottom section
let viewedDataType = 'confirmed'; //initial
let viewedRegion = 'africa'; // initial
let countries = {} // all fetched data are stored in this object

// HTML Elements
let regionButtons = document.querySelectorAll('div.regionButtons > button');
let typeButtons = document.querySelectorAll('div.typeButtons > button');
let sideButtons = document.querySelectorAll('div.sideBar button');
let sortButton = document.getElementById('btnSort');
let trimButton = document.getElementById('btnTrim');
let topCountriesInput = document.getElementById('topInput')
let countriesDiv = document.querySelector('.countries');
let slider = document.getElementById("myRange");
let searchInput = document.getElementById("inputSearch");
let loading = document.querySelector('.threedots');

sideButtons.forEach(button => {
    button.disabled = true;
    button.addEventListener('click', function(e){
        if(e.target.dataset.destination){
            regionButtons.forEach(button => button.style = 'background-color: #fff;color: #222;');
            viewedRegion = e.target.dataset.destination;
        }
        else{
            typeButtons.forEach(button => button.style = 'background-color: #fff;color: #222;');
            viewedDataType = e.target.dataset.type;
        }
        e.target.style = 'background-color: #333; color:#fff;'
        updateChartRegion(viewedRegion,viewedDataType);
    });
});

sortButton.addEventListener('click', sortChart)
trimButton.addEventListener('click', trim)
trimButton.innerHTML = `Show Top ${slider.value} Countries`;
slider.oninput = (e) => trimButton.innerHTML = `Show Top ${e.target.value} Countries`

main();

// Program Functions
async function main(){
    await fetchCountriesByregion();
    await fetchCovidData();
    stopLoading();
}

async function fetchCountriesByregion(){
    for(let i = 0; i < continents.length; i++){
        let response;
        if(continents[i] === 'global')
            response = await fetch(`${myProxy}https://restcountries.herokuapp.com/api/v1`);
        else
            response = await fetch(`${myProxy}https://restcountries.herokuapp.com/api/v1/region/${continents[i]}`);
        let data = await response.json();
        countries[continents[i]] = {};
        countries[continents[i]]['stats'] = [];
        countries[continents[i]].names =  data.map( (element) => element.name.common );
        countries[continents[i]].codes =  data.map( (element) => element.cca2 );
    }
}

async function fetchCovidData(){
    let fetchAllData = await fetch (`${myProxy}http://corona-api.com/countries`);
    let worldCovidData = await fetchAllData.json();
    for(let i = 0; i < continents.length; i++){
        countries[continents[i]].stats = [];
        for(let v = 0; v< countries[continents[i]].codes.length; v++){
            let covidDataByCountry = worldCovidData.data.find((c) => {
                return countries[continents[i]].codes[v] === c.code;
            });
            countries[continents[i]].stats.push(covidDataByCountry);
        }
    }
}

async function updateChartRegion(region,dataType){
        let data = [], labels = []; 
        labels = countries[region][`names`];
        data = getData(region,dataType);
        updateChart(labels,data,dataType);
        updateCountriesView(region);
}

function updateChart(labels, data, label, viewType = 'line'){
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].label = label;
    chart.data.labels = labels;
    chart.type = viewType;
    chart.update();
}

function updateCountriesView(region){
    countriesDiv.innerHTML = '';
    for(let x = 0; x<countries[region].codes.length; x++){
        let country = document.createElement('div');
        let img = document.createElement('img');
        let name = document.createElement('h3');
        let statsObj = countries[region].stats[x];
        let code = countries[region].codes[x];
        name.innerHTML = `${countries[region].names[x]}`
        country.dataset.name = countries[region].names[x];
        img.src = `https://www.countryflags.io/${code}/flat/64.png`;
        country.addEventListener('mouseover', function(){
            img.src =`https://www.countryflags.io/${code}/shiny/64.png` });
        country.addEventListener('mouseout', function(){
            img.src =`https://www.countryflags.io/${code}/flat/64.png` });
        
        country.addEventListener('click', () => { 
            updateChart(
            ['Total Cases', 'New Cases', 'Total Deaths', 'New Deaths', 'Total Recovered', 'Critical'],
            [statsObj.latest_data.confirmed, statsObj.today.confirmed,statsObj.latest_data.deaths, statsObj.today.deaths,
            statsObj.latest_data.recovered, statsObj.latest_data.critical],
            statsObj.name,
            'line');
            window.scrollTo(500,0);
        });
        country.appendChild(img);
        country.appendChild(name);
        country.classList.add('country');
        viewedCountries.push(country);
        countriesDiv.appendChild(country);
    }
}

// Search Countries
searchInput.oninput =  () => {
    viewedCountries.forEach(country => {
        if(!(country.dataset.name.toLowerCase().includes(searchInput.value.toLowerCase())))
            country.style = 'display: none';
        else
            country.style = 'display: flex';
    });
};

function getData(continent, type){
    let stats = countries[continent][`stats`].map(s => s ? s.latest_data[type]:null);
    return stats;
}

function sortChart (){
    let labels = chart.data.labels;
    let data = chart.data.datasets[0].data;
    let chartData = [];
    for(let x = 0; x<labels.length; x++)
        chartData.push([labels[x], data[x]]);
    chartData.sort((a,b) => a[1] - b[1]);
    chart.data.labels = chartData.map(c => c[0]);
    chart.data.datasets[0].data = chartData.map(c => c[1]);
    chart.update();
    return chartData;
}

function trim(){
    let n = slider.value;
    if(n> chart.data.labels.length)
        updateChartRegion(viewedRegion, viewedDataType);
    let chartData = sortChart();
    chartData = chartData.filter((c,i,arr) => i > arr.length - n-1);
    chart.data.labels = chartData.map(c => c[0]);
    chart.data.datasets[0].data = chartData.map(c => c[1]);
    chart.update();
}

function stopLoading(){
    loading.style = 'display: none';
    document.querySelectorAll('button').forEach(b => b.disabled = false);
}