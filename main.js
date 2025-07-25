const body = document.getElementById("body");
const tabIcon = document.getElementById("icon");
const alarm = new Audio("audio/alarm.m4a");
alarm.volume = 1;

let windouWidth = window.innerWidth;

const timerEl = {
  title: document.getElementById("title"),
  clock: document.getElementById("time"),
  bar: document.getElementById("time-bar"),
  alart: document.getElementById("alart"),
  guide: document.querySelectorAll(".guide"),

  quickStartDiv: document.getElementById("shortcuts"),
  quickStartButtons: document.getElementsByClassName("quick-start"),
  pauseButton: document.getElementById("pause"),
  resumeButton: document.getElementById("resume"),
  resetButton: document.getElementById("reset"),
  startButton: document.getElementById("start"),

  autoStopCheckbox: document.getElementById("auto-stop"),
  volumeBar: document.getElementById("volume-bar"),
  volumeBarLabel: document.getElementById("volume-bar-label")
}


const timerInputEl = {
  field: document.getElementById("input-field"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds")
}


let tst = {
  isActivated: false,
  isAutoStopEnabled: false,
  isFocused: true,
  isAllowEnterToStart: true,

  startedTime: undefined, //ms
  endTime: undefined, //ms
  pausedTime: undefined, //ms

  yellowTitleTime: 0, //s
  beforeRemainingSeconds: 0
}


const worker = new Worker("./webWorker.js");

setInterval(setVolume, 30);
setInterval(setAutoStopMode, 30);
setInterval(() => { windouWidth = window.innerWidth }, 30);

window.onload = () => {
  hideGuide();
}


document.body.addEventListener(
  "keydown",
  (ev) => {
    if ((getRemainingSeconds() < 1) && (tst.isActivated)) reset();
    if ((tst.isAllowEnterToStart) && (tst.endTime == undefined) && (ev.code == "Enter")) startFromInput();

    //一時停止/再開[Space]
    if (ev.code == "Space") {
      if (tst.isActivated) { pause(); }
      else if ((!tst.isActivated) && (tst.endTime)) { resume(); }
    };

    //入力消去[Esc]
    if ((!tst.isActivated) && (tst.endTime == undefined) && (ev.code == "Escape")) {
      timerInputEl.minutes.value = null;
      timerInputEl.seconds.value = null;
    };
  },
  { once: false }
);





worker.onmessage = (ev) => {
  const remainingSeconds = ev.data;

  if (remainingSeconds > 0) {
    updateClockDisplay(remainingSeconds);

    tst.beforeRemainingSeconds = remainingSeconds;

    return; //残り時間が1秒以上ならここで終了

  } else {
    playAlarm();
  }
}


function updateClockDisplay(remainingSeconds) {
  const minutesStr = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const secondsStr = String(remainingSeconds % 60).padStart(2, '0');
  const realTimeSeconds = new Date().getSeconds();
  const diff = Math.abs(tst.beforeRemainingSeconds - getRemainingSeconds());

  const clockText = minutesStr + "<span class='colon' id='colon'>:</span>" + secondsStr;
  const titleText = (minutesStr + ":" + secondsStr);

  timerEl.clock.innerHTML = clockText;

  if (diff > 3) {
    tst.yellowTitleTime = 8
    console.log("[" + getRealTimeStr() + "] Restricted background activity: " + (diff - 1) + "s")
  };

  if ((tst.yellowTitleTime > 0) && (remainingSeconds > 0)) {
    timerEl.title.innerHTML = (titleText + " [Activity resumed]");

    if (tst.yellowTitleTime % 2 == 0) {
      tabIcon.href = "icon_yellow.ico";

    } else {
      tabIcon.href = "icon.ico";
    }

    tst.yellowTitleTime--;
  } else {
    timerEl.title.innerHTML = titleText + " Left";
    tabIcon.href = "icon.ico";
  }

  timerEl.bar.style.width = (((Math.floor(getRemainingSeconds())) / tst.maxSeconds) * 500) + "px";
  if (windouWidth < 769) timerEl.bar.style.width = (((Math.floor(getRemainingSeconds())) / tst.maxSeconds) * 300) + "px";

  const colon = document.getElementById("colon");

  if (realTimeSeconds % 2 == 0) {
    colon.style.color = "#ffffffff";
  } else {
    colon.style.color = "#ffffff98";
  }
}


function playAlarm() {
  const realTimeSeconds = new Date().getSeconds();

  timerEl.clock.innerHTML = "00:00";
  timerEl.bar.style.width = "0px";

  if (realTimeSeconds % 2 == 0) {
    body.style.backgroundColor = "white";
    timerEl.clock.style.filter = "invert(100%)";
    timerEl.pauseButton.style.filter = "invert(100%)";
    timerEl.title.innerHTML = "■■■■■■■■■■■■■■■";
    tabIcon.href = "icon_magenta.ico";

    alarm.play();
    if (tst.isAutoStopEnabled) reset();

  } else {
    body.style.backgroundColor = "#505050";
    timerEl.clock.style.filter = "invert(0%)";
    timerEl.pauseButton.style.filter = "invert(0%)";
    timerEl.title.innerHTML = "□□□□□□□□□□□□□□□";
    tabIcon.href = "icon.ico";
  }
}





/**
 * タイマーを開始する
 * @param {number} timeLeft 
 */
function start(timeLeft) {
  tst.maxSeconds = timeLeft;
  tst.beforeRemainingSeconds = timeLeft;
  tst.isActivated = true;
  tst.isAllowEnterToStart = false;
  tst.startedTime = Date.now();
  tst.endTime = Date.now() + (timeLeft * 1000);

  const minutesStr = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secondsStr = String(timeLeft % 60).padStart(2, '0');

  timerEl.clock.innerHTML = minutesStr + ":" + secondsStr;
  timerEl.title.innerHTML = minutesStr + ":" + secondsStr + " Left";
  timerEl.bar.style.width = 500 + "px";
  timerEl.clock.style.display = "flex";
  timerInputEl.field.style.display = "none";

  for (let i = 0; i < timerEl.quickStartButtons.length; i++) {
    timerEl.quickStartButtons[i].style.color = "transparent";
    timerEl.quickStartButtons[i].style.filter = "blur(10px)";
  }
  setTimeout(() => {
    timerEl.quickStartDiv.style.display = "none";
  }, 300);

  timerEl.startButton.style.display = "none";
  timerEl.pauseButton.style.display = "inline-block";

  worker.postMessage([tst.endTime, true]);
  console.log("[" + getRealTimeStr() + "] started\nlength: " + (getRemainingSeconds()));
}



//指定入力された時間でタイマーを開始する
function startFromInput() {
  const newTime = ((Number(timerInputEl.minutes.value) * 60) + Number(timerInputEl.seconds.value));
  if (newTime == 0) {
    return;
  }

  start(newTime)
}



//一時停止
function pause() {
  tst.isActivated = false;

  if (Math.floor((tst.endTime - Date.now()) / 1000) < 1) { //タイマーが鳴っていれば終了する
    reset();
    return;
  }

  tst.pausedTime = Date.now();

  tabIcon.href = "icon_gray.ico";

  timerEl.resumeButton.style.display = "inline-block";
  timerEl.resetButton.style.display = "inline-block";
  timerEl.pauseButton.style.display = "none";

  const minutesStr = String(Math.floor(getRemainingSeconds() / 60)).padStart(2, '0');
  const secondsStr = String(getRemainingSeconds() % 60).padStart(2, '0');
  timerEl.title.innerHTML = minutesStr + ":" + secondsStr + " ■PAUSED■";

  worker.postMessage([tst.endTime, false]);
}



//再開
function resume() {
  tst.isActivated = true;
  tabIcon.href = "icon.ico";

  timerEl.resumeButton.style.display = "none";
  timerEl.resetButton.style.display = "none";
  timerEl.pauseButton.style.display = "inline-block";

  const now = Date.now();
  tst.endTime += ((now - tst.pausedTime));

  worker.postMessage([tst.endTime, true]);
}



//タイマーを終了
function reset() {
  tst.isActivated = false;

  timerEl.title.innerHTML = "Timer";
  timerEl.clock.innerHTML = "00:00";
  timerEl.bar.style.width = "0px";

  body.style.backgroundColor = "#505050";
  timerEl.clock.style.filter = "invert(0%)";
  timerEl.quickStartDiv.style.display = "flex";
  tabIcon.href = "icon.ico";

  for (let i = 0; i < timerEl.quickStartButtons.length; i++) {
    timerEl.quickStartButtons[i].style.color = "white";
    timerEl.quickStartButtons[i].style.filter = "blur(0px)";
  }
  timerEl.clock.style.display = "none";
  timerInputEl.field.style.display = "flex";

  setTimeout(() => {
    timerEl.pauseButton.removeAttribute("style");
    timerEl.resumeButton.removeAttribute("style");
    timerEl.resetButton.removeAttribute("style");

    timerEl.startButton.style.display = "inline-block";
  }, 1);

  worker.postMessage([undefined, false]);
  tst.endTime = undefined;
  tst.startedTime = undefined;

  setTimeout(() => {
    tst.isAllowEnterToStart = true;
  }, 100);
}


//自動でタイマーを止める　を切り替える
function setAutoStopMode() {
  if (timerEl.autoStopCheckbox.checked) {
    tst.isAutoStopEnabled = true;
  } else {
    tst.isAutoStopEnabled = false;
  }
}



//音量を変更する
function setVolume() {
  const volume = timerEl.volumeBar.value;
  timerEl.volumeBarLabel.innerHTML = ("Volume: " + volume + "%");
  alarm.volume = volume * 0.01;
}



//ガイドを非表示
function hideGuide() {
  setTimeout(() => {
    timerEl.guide.forEach(el => {
      el.style.color = "transparent";

      setTimeout(() => {
        el.style.display = "none";
      }, 1500);

    });
  }, 10000);
}



/**
 * 
 * @returns {number}
 */
function getRemainingSeconds() {
  return Math.floor((tst.endTime - (Date.now())) / 1000);
}



/**
 * 
 * @returns {text}
 */
function getRealTimeStr() {
  const realTime = new Date();
  const hoursStr = String(Math.floor(realTime.getHours())).padStart(2, '0');
  const minutesStr = String(Math.floor(realTime.getMinutes())).padStart(2, '0');
  const secondsStr = String(realTime.getSeconds()).padStart(2, '0');
  return (hoursStr + ":" + minutesStr + ":" + secondsStr);
}
