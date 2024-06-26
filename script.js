// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image

// the link to your model provided by Teachable Machine export panel
//const URL = "https://teachablemachine.withgoogle.com/models/rYnyUCVkP/";
const URL = "model3/";

let model, webcam, labelContainer, maxPredictions;
let lastTick = 0;
let lastDetectionClass = null;
let lastDetectionTime = 0;

// Load the image model and setup the webcam
async function init() {
  loaderProgress.classList.remove("is-hidden");
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";
  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  // Convenience function to setup a webcam
  const flip = true; // whether to flip the webcam
  webcam = new tmImage.Webcam(240, 240, flip); // width, height, flip
  await webcam.setup(); // request access to the webcam
  await webcam.play();

  // append elements to the DOM
  document.getElementById("webcam-container").appendChild(webcam.canvas);
  var canvas = document
    .getElementById("webcam-container")
    .querySelector("canvas");
  canvas.style.maxWidth = "100%";

  // Build a table for our classification outputs
  while (tblPredictionLabels.rows.length) {
    tblPredictionLabels.rows[0].remove();
  }
  for (let i = 0; i < maxPredictions; i++) {
    tblPredictionLabels.appendChild(tmplLabelRow.content.cloneNode(true));
  }

  window.requestAnimationFrame(loop);
  loaderProgress.classList.add("is-hidden");
}

function destroyWebcam() {
  // remove the canvas element child of webcam-container
  webcam.stop();
  webcamcontainer = document.getElementById("webcam-container");
  webcamcontainer.removeChild(webcamcontainer.firstChild);
  webcam = null;
}

async function loop() {
  if (!webcam) {
    return; // we destroyed it with "stop"
  }
  // throttle to 10 fps or so to save a bit of battery
  if (Date.now() < lastTick + 200) {
    window.requestAnimationFrame(loop);
    return;
  }
  webcam.update(); // update the webcam frame
  await predict();
  lastTick = Date.now();
  window.requestAnimationFrame(loop);
}

// run the webcam image through the image model
async function predict() {
  // predict can take in an image, video or canvas html element
  const prediction = await model.predict(webcam.canvas);
  for (let i = 0; i < maxPredictions; i++) {
    const row = tblPredictionLabels.rows[i];
    const probability = prediction[i].probability;
    const className = prediction[i].className;
    row.cells[0].innerText = className;
    row.cells[1].innerText = probability.toFixed(2);
    const prog = row.cells[2].querySelector("progress");
    prog.value = probability;

    if (probability > 0.7) {
      // confident prediction! emit a ding, update states, etc
      prog.classList.add("is-success");
      emitDetection(className);
    } else {
      prog.classList.remove("is-success");
    }
  }
  // sort MAX first
  prediction.sort((a, b) => b.probability - a.probability);
  dbgLabel.innerText = `prediction: ${prediction[0].className}, ${prediction[0].probability.toFixed(2)}`;
}

function emitDetection(classname) {
  const timeElapsedSinceLastDetection =
    (new Date().getTime() - lastDetectionTime) / 1000;
  if (lastDetectionClass == classname || timeElapsedSinceLastDetection < 5) {
    return;
  }
  lastDetectionClass = classname;
  lastDetectionTime = new Date().getTime();

  swapPredictionImage(classname);
}

function swapPredictionImage(classname) {
  console.log(">>> swapPredictionImage", classname);
  elAudioPing.play();

  var boxcontainer = boxTrashKind;
  var elImg = boxcontainer.querySelector("img");
  var elTitle = boxcontainer.querySelector("p.title");

  var compostAudios = [elAudioCompost1, elAudioCompost2];
  var trashAudios = [elAudioTrash1];
  var recyclingAudios = [elAudioRecycling1, elAudioRecycling2];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  switch (classname) {
    case "recycling":
      elImg.src = "Recycling-Image.png";
      elTitle.innerText = "Recycling";
      pick(recyclingAudios).play();
      break;
    case "compost":
      elImg.src = "Compost-Image.png";
      elTitle.innerText = "Compost";
      pick(compostAudios).play();
      break;
    case "trash":
      elImg.src = "Trash-Image.png";
      elTitle.innerText = "Trash";
      pick(trashAudios).play();
      break;
    default:
      // "other class", just ignore it and leave the last detection on screen
      // elImg.src = "none.jpg";
      // elTitle.innerText = "Unknown";
      break;
  }
}
