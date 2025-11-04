var d = document,
  style,
  mainModalDiv,
  overlay,
  close,
  a;
style = d.createElement("style");
var position = d.getElementById("porsline-share").getAttribute("data-position");
style.innerHTML = `.porsline-box {width: 90%;margin: 0 auto;background: rgba(255, 255, 255, 0.2);padding: 35px;border: 2px solid #fff;border-radius: 20px/50px;background-clip: padding-box;text-align: center;}\
    .porsline-overlay {position: fixed;height: 0;bottom: 0;left: 0;right: 0;background: rgba(0, 0, 0, 0.7);visibility: hidden;opacity: 0;transition: all 700ms;}\
    .porsline-overlay:target {visibility: visible;opacity: 1; z-index: 10000}\
    .porsline-slider {width: 70%;height: 100vh;position: relative;transition: all 500ms ease-in-out;margin-left: ${position === "left" ? "-100%" : "100%"
  };transition: all 500ms ease-in-out;}\
    .open .porsline-slider {margin: ${position === "left" ? "0" : "0 0 0 30%"
  }; transition: all 500ms ease-in-out;}\
    .porsline-slider .porsline-close {transition: all 200ms;text-decoration: none;cursor: pointer;position: absolute;border: 1px solid #f0f2f5;top: 16px;${position === "right" ? "left" : "right"
  }: -16px;background-color: #3e434d;width: 32px;height: 32px;border-radius: 50%;display: flex;align-items: center;justify-content: center;}\
    .porsline-slider .porsline-content {height: 100vh;}\
    #porsline-slider-iframe {width: 100%; height: 100%;border: none;}\
    .porsline-button {color: white;border-radius: 4px;padding: 7px 16px;line-height: 1.4;text-align: center;text-decoration: none;display: inline-block;text-decoration: none;font-size: 16px;margin: 4px 2px;cursor: pointer;background-color: #118EB7;width: auto;}\
    @media (max-width: 1024px) { .porsline-overlay { background: none; height: 95% !important; top: unset !important;} .porsline-slider {width: 100%; margin-left: 0; margin-top: 100%} .porsline-slider .porsline-close { top: -16px; ${position === "right" ? "left" : "right"
  }: 16px;} .open .porsline-slider {margin: 0;} .porsline-content #porsline-slider-iframe {border-radius: 16px 16px 0 0}`;
d.getElementsByTagName("head")[0].appendChild(style);
var closeIcon = `<svg
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      id="Share-on-Web"
      stroke="none"
      stroke-width="1"
      fill="none"
      fill-rule="evenodd"
    >
      <g id="Assets" transform="translate(-101, -209)">
        <g id="Icon/Normal/Close" transform="translate(101, 209)">
          <rect id="Rectangle" x="0" y="0" width="24" height="24"></rect>
          <rect
            id="Rectangle"
            fill="#FFF"
            transform="translate(12, 12) rotate(45) translate(-12, -12)"
            x="11"
            y="5"
            width="2"
            height="14"
            rx="1"
          ></rect>
          <rect
            id="Rectangle"
            fill="#FFF"
            transform="translate(12, 12) rotate(135) translate(-12, -12)"
            x="11"
            y="5"
            width="2"
            height="14"
            rx="1"
          ></rect>
        </g>
      </g>
    </g>
  </svg>`;
mainModalDiv = d.createElement("div");
mainModalDiv.id = "porsline-slider";
mainModalDiv.className = "porsline-overlay";
mainModalDiv.innerHTML = `<div class=\"porsline-slider\">\
		<div class=\"porsline-slider-header\">\
            <a class=\"porsline-close\" role=\"button\" onclick=\"closeSlider()\">${closeIcon}</a>\
        </div>\
		<div class=\"porsline-content\">\
            <iframe id=\"porsline-slider-iframe\"></iframe>\
		</div>\
	</div>`;

d.getElementsByTagName("body")[0].appendChild(mainModalDiv);

overlay = d.getElementsByClassName("porsline-overlay")[0];

overlay.onclick = function () {
  closeSlider();
};

closeSlider = function () {
  overlay.classList.remove("open");
  setTimeout(() => {
    overlay.style.visibility = "hidden";
    overlay.style.opacity = "0";
    overlay.style.top = "auto";
    overlay.style.height = "0";
    d.getElementById("porsline-slider-iframe").src = "";
  }, 500);
};

showSlider = function () {
  overlay.style.height = "auto";
  overlay.style.top = "0";
  overlay.style.visibility = "visible";
  overlay.style.opacity = 1;
  overlay.classList.add("open");
};
var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
var eventer = window[eventMethod];
var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
eventer(
  messageEvent,
  function (e) {
    if (e.data == "hello") closeSlider();
  },
  false
);
d.getElementsByTagName("body")[0].onkeydown = function (e) {
  if (e.code == "Escape") closeSlider();
};
