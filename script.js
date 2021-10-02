class DataHandler {
    constructor(){
        this.genres = {};
        this.studios = {};
        this.tags = {};
        this.allStaff = {};
        this.defaultValues = {};
        
        this.name = document.getElementById("username").value;
    }

    async fetchLists() {
        const query = `
            query($name: String!){
                MediaListCollection(userName: $name, type: ANIME){
                    lists{
                        name
                        entries{
                            ... mediaListEntry
                        }
                    }
                }
            }

            fragment mediaListEntry on MediaList{
                media{
                    title{romaji}
                    tags{
                        name
                        rank
                    }
                    genres
                    averageScore
                    studios(isMain: true){
                        nodes{
                            name
                            isAnimationStudio
                        }
                    }
                    staff(sort: [RELEVANCE]) {
                        edges {
                            role
                            node {
                                id
                            }
                        }
                    }
                    coverImage {large}
                    siteUrl
                }
                scoreRaw: score(format: POINT_100)
            }
        `;

        const variables = {
            name: this.name
        };

        const url = 'https://graphql.anilist.co',
            options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    variables: variables
                })
            };

        function handleResponse(response) {
            return response.json().then(function (json) {
                return response.ok ? json : Promise.reject(json);
            });
        }

        function handleData(data) {
            return data.data.MediaListCollection.lists;
        }

        function handleError(error) {
            //alert('Error');
            console.error(error);
        }

        const lists = await fetch(url, options).then(handleResponse)
            .then(handleData)
            .catch(handleError);

        return lists;
    }


    async fetchSeason(nSeason, nYear) {
        const query = `
        query($season: MediaSeason, $year: Int){
            Page(page: 1) {
              media(season: $season, seasonYear: $year, format: TV, sort: [SCORE_DESC]) {
                title {
                  romaji
                }
                tags {
                  name
                  rank
                }
                genres
                averageScore
                studios(isMain: true) {
                  nodes {
                    name
                    isAnimationStudio
                  }
                }
                staff(sort: [RELEVANCE]) {
                  edges {
                    role
                    node {
                      id
                    }
                  }
                }
                coverImage {
                  large
                }
                siteUrl
              }
            }
          }   
        `;
    
        const variables = {
            "year": nYear,
            "season": nSeason
        };
    
        const url = 'https://graphql.anilist.co',
            options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    variables: variables
                })
            };
    
        function handleResponse(response) {
            return response.json().then(function (json) {
                return response.ok ? json : Promise.reject(json);
            });
        }
    
        function handleData(data) {
            return data.data.Page;
        }
    
        function handleError(error) {
            //alert('Error, check console');
            console.error(error);
        }
    
        const list = await fetch(url, options).then(handleResponse)
            .then(handleData)
            .catch(handleError);
    
        return list;
    }

    reducer(a,b) {
        return a + b;
    };

    average(scores) {
        if (scores.length === 0) {
            return 0;
        } 
        const total = scores.reduce(this.reducer);
        return total / scores.length;
    }

    countData(list) {
        list.forEach(entry => {
            entry.media.genres.forEach(genre => this.genres[genre] = this.genres[genre] ? {
                count: this.genres[genre].count + 1,
                total: this.genres[genre].total + entry.scoreRaw
            } : {
                count: 1,
                total: entry.scoreRaw
            });    
            
            entry.media.tags.forEach(tag => this.tags[tag.name] = this.tags[tag.name] ? {
                count: this.tags[tag.name].count + 1,
                total: this.tags[tag.name].total + entry.scoreRaw
            } : {
                count: 1,
                total: entry.scoreRaw
            });

            const aniStudios = entry.media.studios.nodes.filter(studio => studio.isAnimationStudio);
            aniStudios.forEach(studio => this.studios[studio.name] = this.studios[studio.name] ? {
                count: this.studios[studio.name].count + 1,
                total: this.studios[studio.name].total + entry.scoreRaw
            } : {
                count: 1,
                total: entry.scoreRaw
            });
            
            entry.media.staff.edges.forEach(staff => this.allStaff[staff.node.id] = this.allStaff[staff.node.id] ? {
                count: this.allStaff[staff.node.id].count + 1,
                total: this.allStaff[staff.node.id].total + entry.scoreRaw
            } : {
                count: 1,
                total: entry.scoreRaw
            });
        });   
    }

    averageData() {
        let genreValues = [];
        for (const [key, value] of Object.entries(this.genres)) {
            this.genres[key] = value.total / value.count;
            genreValues.push(this.genres[key]);
        }
        const defaultGenreValue = this.average(genreValues);

        let tagValues = [];
        for (const [key, value] of Object.entries(this.tags)) {
            this.tags[key] = value.total / value.count;
            tagValues.push(this.tags[key]);
        }
        const defaultTagValue = this.average(tagValues);
        
        let studioValues = [];
        for (const [key, value] of Object.entries(this.studios)) {
            this.studios[key] = value.total / value.count;
            studioValues.push(this.studios[key]);
        }
        const defaultStudioValue = this.average(studioValues);

        let staffValues = [];
        for (const [key, value] of Object.entries(this.allStaff)) {
            this.allStaff[key] = value.total / value.count;
            staffValues.push(this.allStaff[key]);
        }
        const defaultStaffValue = this.average(staffValues);
        
        this.defaultValues = { defaultGenreValue, defaultTagValue, defaultStudioValue, defaultStaffValue };
    }

    createDataArray = (list, isMediaList) => {
        const data = [];
        const {defaultGenreValue, defaultTagValue, defaultStudioValue, defaultStaffValue} = this.defaultValues;

        list.forEach(entry => {
            const inputData = [];
            const additionalData = {};

            const genreScores = [];
            const genres = isMediaList ? entry.genres : entry.media.genres;
            genres.forEach(genre => {
                this.genres[genre] ? genreScores.push(this.genres[genre]) : genreScores.push(defaultGenreValue);
            });
            inputData.push(this.average(genreScores));
            
            const studioScores = [];
            const studios = isMediaList ? entry.studios.nodes : entry.media.studios.nodes;
            const aniStudios = studios.filter(studio => studio.isAnimationStudio);
            aniStudios.forEach(studio => {
                this.studios[studio.name] ? studioScores.push(this.studios[studio.name]) : studioScores.push(defaultStudioValue);
            });
            inputData.push(this.average(studioScores));
    
            const tagScores = [];
            const tags = isMediaList ? entry.tags : entry.media.tags;
            const topTags = tags.filter(tag => tag.rank >= 66);
            topTags.forEach(tag => {
                this.tags[tag.name] ? tagScores.push(this.tags[tag.name]) : tagScores.push(defaultTagValue);
            });
            inputData.push(this.average(tagScores));
    
            const staffScores = [];
            const allStaff = isMediaList ? entry.staff.edges : entry.media.staff.edges;
            allStaff.forEach(staff => {
                this.allStaff[staff.node.id] ? staffScores.push(this.allStaff[staff.node.id]) : staffScores.push(defaultStaffValue);
            }); 
            inputData.push(this.average(staffScores));

            isMediaList ? inputData.push(entry.averageScore) : inputData.push(entry.media.averageScore);

            isMediaList ? inputData.push(0) : inputData.push(entry.scoreRaw);

            additionalData.title = isMediaList ? entry.title.romaji : entry.media.title.romaji;
            additionalData.image = isMediaList ? entry.coverImage.large : entry.media.coverImage.large;
            additionalData.url = isMediaList ? entry.siteUrl : entry.media.siteUrl;

            data.push({ inputData, additionalData });
        });
        return data;
    }

    normaliseData(inputData, maxValue, minValue) {
        inputData.forEach(entry => {
            for (let i = 0; i < entry.length; i++) {
                entry[i] = (entry[i] - minValue) / (maxValue - minValue);
            }
        });
        return inputData;
    }

    minMaxData(inputData) {
        let maxValue = 0;
        let minValue = 0;

        inputData.forEach(entry => {
            for (let i = 0; i < entry.length; i++) {
                if (entry[i] > maxValue) {
                    maxValue = entry[i];
                } else if (entry[i] < minValue) {
                    minValue = entry[i];
                }
            }
        });

        return { normalData: this.normaliseData(inputData, maxValue, minValue), maxValue, minValue };
    }
}

class MachineModel {
    constructor(size) {
        this.model = tf.sequential();
        
        this.model.add(tf.layers.dense({inputShape: [size], units: 1, useBias: true}));
        this.model.add(tf.layers.dense({units: 500, activation: 'relu'}));
        this.model.add(tf.layers.dense({units: 1, useBias: true}));
    }

    showModel() {
        tfvis.show.modelSummary({name: 'Model Summary'}, this.model);
    }

    convertToTensor(data) {
        return tf.tidy(() => {

          const inputs = data.map(d => {
            const entry = [...d];
            entry.pop();
            return entry;
          });

          const labels = data.map(d => d[d.length - 1]);
      
          const inputTensor = tf.tensor2d(inputs, [inputs.length, inputs[0].length]);
          const labelTensor = tf.tensor2d(labels, [labels.length, 1]);
      
          return {
            inputs: inputTensor,
            labels: labelTensor,
          } 
        });
    }

    async trainModel(inputs, labels) {
        this.model.compile({
          optimizer: tf.train.adam(),
          loss: tf.losses.meanSquaredError,
          metrics: ['mse'],
        });
      
        const batchSize = 32;
        const epochs = 500;
      
        return await this.model.fit(inputs, labels, {
          batchSize,
          epochs,
          shuffle: true,
          callbacks: tfvis.show.fitCallbacks(
            { name: 'Training Performance' },
            ['loss', 'mse'],
            { height: 200, callbacks: ['onEpochEnd'] }
          )
        });
    }

    prediction(inputs) {
        return this.model.predict(inputs);
    }
}

const run = async () => {
    if (!document.getElementById("username").value) {
        return;
    }
    document.getElementById("submit").disabled = true;
    const images = document.getElementsByClassName("image");
    while(images.length > 0) {
        images[0].remove();
    }
    document.getElementById("message").innerHTML = "Please wait...";

    const dataHandler = new DataHandler();
    const lists = await dataHandler.fetchLists();
    if(!lists) {
        document.getElementById("submit").disabled = false;
        document.getElementById("message").innerHTML = "Error";
        return;
    }
    const [completedList] = lists.filter(list => list.name === 'Completed');

    const trainingList = completedList.entries.slice(0, Math.floor(completedList.entries.length / 10) * 7);
    const testList = completedList.entries.slice(Math.floor(completedList.entries.length / 10) * 7, completedList.entries.length);

    dataHandler.countData(completedList.entries);
    dataHandler.averageData();

    const data = dataHandler.createDataArray(completedList.entries, false);
    tf.util.shuffle(data);
    const { normalData, maxValue, minValue } = dataHandler.minMaxData(data.map(d => d.inputData));
    
    const model = new MachineModel(normalData[0].length - 1);
    model.showModel();

    let { inputs, labels } = model.convertToTensor(normalData);

    await model.trainModel(inputs, labels);

    const [watchingList] = lists.filter(list => list.name === "Watching");
    const [customList] = lists.filter(list => list.name === "AWC Gambler");
    const [pausedList] = lists.filter(list => list.name === "Paused");
    const [planningList] = lists.filter(list => list.name === "Planning");

    //const selectedSeason = await dataHandler.fetchSeason("FALL", 2013);

    const testData = dataHandler.createDataArray(planningList.entries, false);
    //const testData = dataHandler.createDataArray(selectedSeason.media, true);
    tf.util.shuffle(testData);
    const normalTestData = dataHandler.normaliseData(testData.map(d => d.inputData), maxValue, minValue);

    ({ inputs, labels } = model.convertToTensor(normalTestData));

    const predictions = model.prediction(inputs).dataSync();    
    const s = normalTestData[0].length - 1;

    const output = [];
    let mse = [];
    let correct = 0;
    for (let i = 0; i < predictions.length; i++) {
        const normPrediction = (predictions[i] * (maxValue - minValue)) + minValue;
        const normActual = (normalTestData[i][s] * (maxValue - minValue)) + minValue;
        if ((normPrediction > normActual - 10) && (normPrediction < normActual + 10)) {
            correct++;
        }
        output.push({ normPrediction, normActual, title: testData[i].additionalData.title, image: testData[i].additionalData.image, url: testData[i].additionalData.url});
        mse.push(Math.pow((normalTestData[i][s] - predictions[i]), 2));
    }

    const sorted = output.sort((a, b) => b.normPrediction - a.normPrediction);
    sorted.forEach(entry => console.log(`${entry.title} : ${entry.normPrediction} | ${entry.normActual}`));

    const { defaultGenreValue } = dataHandler.defaultValues;
    const recommended = sorted.filter(entry => entry.normPrediction > defaultGenreValue);

    const total = mse.reduce(dataHandler.reducer);
    console.log(total / mse.length);
    console.log(correct / mse.length);

    document.getElementById("message").innerHTML = "Recommended shows for you:";

    for (let entry = 0; entry < recommended.length; entry++) {
        const img = document.createElement("a");
        img.classList.add('image');
        img.href = recommended[entry].url;
        img.style.backgroundImage = `url(${recommended[entry].image})`;
        main.appendChild(img);
    }

    document.getElementById("submit").disabled = false;
}

const saveBtn = document.getElementById("submit");
saveBtn.addEventListener('click', run);

