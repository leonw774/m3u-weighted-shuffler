document.getElementById('shuffleBtn')
    .addEventListener('click', shuffleBtnFunc);

function getFormatDate() {
    let d = new Date();
    let options = {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    };
    return d.toLocaleTimeString("zh", options)
        .replaceAll('/', '-')
        .replaceAll(':', '-')
        .replace(' ', '-');
}

function displayPlaylist(playlist, listid) {
    const fileInput = document.getElementById('fileInput');
    const listDiv = document.getElementById(listid);
    let displayedText = ''
    for (let i = 0; i < playlist.length; i++) {
        if (playlist[i].artist != '') {
            displayedText += `${playlist[i].artist} - `;
        }
        displayedText += `${playlist[i].title}\n`;
    }
    listDiv.innerText = displayedText;
}

function bisectRight(arr, value, lo=0, hi=arr.length) {
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] <= value) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

function weightedShuffle(arr, weights) {
    const getCumSum = (sum => value => sum += value)(0);
    const weightCumSum = weights.map(getCumSum);
    // console.log(weightCumSum);
    const shuffledArr = [];
    const epsilon = 1e-9;
    for (let i = 0; i < arr.length; i++) {
        const r = Math.random() * weightCumSum[arr.length - 1];
        const j = bisectRight(weightCumSum, r);
        // console.log(r, j);
        shuffledArr.push(arr[j]);
        for (let k = j; k < arr.length; k++) {
            weightCumSum[k] -= weights[j]
            if (Math.abs(weightCumSum[k]) < epsilon) {
                weightCumSum[k] = 0;
            }
        }
        // console.log(weightCumSum);
    }
    return shuffledArr;
}

function shuffleBtnFunc() {
    const fileInput = document.getElementById('fileInput');
    const downloadLink = document.getElementById('downloadLink');
    const downloadBtn = document.getElementById('downloadBtn');

    if (fileInput.files.length === 0) {
        alert('Please select a file first.');
        return;
    }

    const decayRateStr = document.getElementById('decayRate').value;
    if (isNaN(decayRateStr)) {
        alert('invalid input for decayRate');
        return;
    }
    const decayRate = parseFloat(decayRateStr);
    if (decayRate < 0) {
        alert('decayRate cannot be less than zero.');
        return;
    }

    const checkedMethod = 
        document.querySelector('input[name="decayFormula"]:checked').value;
    const weightFunc = (checkedMethod === "linear") ? (
        (index, length) => length - decayRate * Math.min(
            index,
            Math.floor(length / decayRate)
        )
    ) : (
        (index, length) => Math.E ** (-2 * Math.PI * decayRate * index / length)
    );
    // console.log(decayRate, checkedMethod);

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const playlist = window.M3U.parse(event.target.result);
        if (playlist.length === 0) {
            alert('The playlist is empty.');
            return;
        }
        // remove <unknown> artists
        for (let i = 0; i < playlist.length; i++) {
            playlist[i].artist = playlist[i].artist
                .trim()
                .replace('<unknown> - ', '')
                .replace('<unknown>', '')
        }
        console.log(playlist);
        const weights = []
        for (let i = 0; i < playlist.length; i++) {
            weights.push(weightFunc(i, playlist.length));
        }
        console.log(weights);
        
        const shuffledList = weightedShuffle(playlist, weights);
        // console.log(shuffledList);

        displayPlaylist(playlist, 'uploadedList');
        displayPlaylist(shuffledList, 'shuffledList');

        const lines = ['#EXTM3U']
        for (let i = 0; i < shuffledList.length; i++) {
            lines.push(
                // `#EXTINF:${shuffledList[i].length},${shuffledList[i].artist}`
                // + `- ${shuffledList[i].title}\n` +
                shuffledList[i].file
            )
        }
        const shuffledM3U = lines.join('\n');
        const blob = new Blob([shuffledM3U], { type: 'm3u/plain' });
        const url = URL.createObjectURL(blob);

        downloadLink.href = url;
    };

    reader.onerror = function(event) {
        alert("Cannot open file.");
        return;
    }

    reader.readAsText(file);
}