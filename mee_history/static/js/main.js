(function () {
  const config = window.MEEHISTORY_CONFIG || {};
  const characterId = config.characterId || "einstein";
  const characterName = config.characterName || "Albert Einstein";

  let localStream = null;
  let inCall = false;
  let isRequestInFlight = false;
  let conversationHistory = [];

  const userVideo = document.getElementById("userVideo");
  const chatLogEl = document.getElementById("chatLog");
  const statusEl = document.getElementById("statusMessage");
  const formEl = document.getElementById("chatForm");
  const messageInput = document.getElementById("userMessage");
  const endCallButton = document.getElementById("endCallButton");

  async function startCall() {
    if (inCall) return;
    inCall = true;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStream = stream;
        if (userVideo) {
          userVideo.srcObject = stream;
          const playPromise = userVideo.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {});
          }
        }
      } else {
        setStatus("This browser does not support real-time camera access.");
      }

      setStatus("You are now in a surreal call with " + characterName + ".");
    } catch (err) {
      console.error("Error starting call", err);
      setStatus("Could not access camera or microphone. Check browser permissions.");
    }
  }

  function endCall() {
    if (!inCall) return;
    inCall = false;
    if (localStream) {
      localStream.getTracks().forEach(function (t) {
        t.stop();
      });
      localStream = null;
    }
    if (userVideo && userVideo.srcObject) {
      userVideo.srcObject = null;
    }
    stopEinsteinSpeaking();
    setStatus("Call ended. Refresh the page to start again.");
  }

  function setStatus(text) {
    if (statusEl) {
      statusEl.textContent = text || "";
    }
  }

  function appendChatEntry(role, text) {
    if (!chatLogEl || !text) return;
    var wrapper = document.createElement("div");
    wrapper.className = "chat-entry " + role;
    var meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = role === "user" ? "You" : characterName;
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    wrapper.appendChild(meta);
    wrapper.appendChild(bubble);
    chatLogEl.appendChild(wrapper);
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  }

  async function onChatSubmit(event) {
    if (event) event.preventDefault();
    if (!messageInput) return;
    var text = messageInput.value.trim();
    if (!text || isRequestInFlight) return;

    isRequestInFlight = true;
    messageInput.value = "";
    appendChatEntry("user", text);
    conversationHistory.push({ role: "user", content: text });
    setStatus("Einstein is thinking…");

    try {
      var res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          character_id: characterId,
          history: conversationHistory,
        }),
      });

      if (!res.ok) {
        var errBody = await res.json().catch(function () {
          return {};
        });
        throw new Error(errBody.error || "Request failed with status " + res.status);
      }
      var data = await res.json();
      var reply = (data && data.reply) || "";
      if (reply) {
        conversationHistory.push({ role: "assistant", content: reply });
        appendChatEntry("assistant", reply);
        speakAsEinstein(reply);
        setStatus("");
      } else {
        setStatus("Einstein was momentarily speechless. Try asking again.");
      }
    } catch (err) {
      console.error("Error talking to backend", err);
      setStatus("Something went wrong talking to Einstein. Please try again.");
    } finally {
      isRequestInFlight = false;
    }
  }

  function speakAsEinstein(text) {
    if (!("speechSynthesis" in window) || !text) {
      return;
    }
    try {
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 0.9;

      var voices = window.speechSynthesis.getVoices() || [];
      var preferred =
        voices.find(function (v) {
          return /de-|german|male/i.test((v.lang || "") + " " + (v.name || ""));
        }) ||
        voices.find(function (v) {
          return /en-|english/i.test(v.lang || "");
        });
      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onstart = function () {
        startEinsteinSpeaking();
      };
      utterance.onend = function () {
        stopEinsteinSpeaking();
      };
      utterance.onerror = function () {
        stopEinsteinSpeaking();
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("TTS error", err);
    }
  }

  function startEinsteinSpeaking() {
    document.body.classList.add("einstein-speaking");
  }

  function stopEinsteinSpeaking() {
    document.body.classList.remove("einstein-speaking");
  }

  function setupUi() {
    if (formEl) {
      formEl.addEventListener("submit", onChatSubmit);
    }
    if (endCallButton) {
      endCallButton.addEventListener("click", function () {
        endCall();
      });
    }
  }

  window.addEventListener("load", function () {
    setupUi();
    startCall();
  });
})();
