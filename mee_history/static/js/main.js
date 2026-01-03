(function () {
  const config = window.MEEHISTORY_CONFIG || {};
  const characterId = config.characterId || "einstein";
  const characterName = config.characterName || "Albert Einstein";
  const ttsLangHint = config.ttsLangHint || "";
  const ttsVoiceKeyword = config.ttsVoiceKeyword || "";
  const introLine = config.introLine || "";
  const VOICE_STYLES = {
    einstein: { rate: 0.9, pitch: 0.85, volume: 0.95 },
    curie: { rate: 1.0, pitch: 1.08, volume: 0.9 },
    tesla: { rate: 0.97, pitch: 0.95, volume: 1.0 },
    davinci: { rate: 0.98, pitch: 0.92, volume: 0.95 },
    lovelace: { rate: 1.02, pitch: 1.05, volume: 0.92 },
    cleopatra: { rate: 0.99, pitch: 1.0, volume: 0.96 },
    socrates: { rate: 0.94, pitch: 0.9, volume: 0.98 },
    shakespeare: { rate: 0.96, pitch: 0.93, volume: 0.94 },
    siri: { rate: 1.03, pitch: 1.0, volume: 1.0 },
    ara: { rate: 1.0, pitch: 0.98, volume: 1.0 },
    guide: { rate: 0.95, pitch: 0.88, volume: 1.0 },
    futurist: { rate: 1.02, pitch: 1.02, volume: 1.0 },
  };

  let localStream = null;
  let inCall = false;
  let isRequestInFlight = false;
  let conversationHistory = [];

  // Speech recognition state
  let recognition = null;
  let isRecognizing = false;
  let shouldKeepListening = false;
  let lastFinalTranscript = "";

  const userVideo = document.getElementById("userVideo");
  const statusEl = document.getElementById("statusMessage");
  const transcriptOverlay = document.getElementById("transcriptOverlay");
  const endCallButton = document.getElementById("endCallButton");
  const micButton = document.getElementById("micButton");
  const remoteTile = document.getElementById("remoteTile");
  const avatarMouth = document.getElementById("avatarMouth");

  // Character picker elements
  const pickerToggle = document.getElementById("characterPickerToggle");
  const modalBackdrop = document.getElementById("characterModalBackdrop");
  const modalEl = document.getElementById("characterModal");
  const modalClose = document.getElementById("characterModalClose");
  const searchInput = document.getElementById("characterSearchInput");

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

      setStatus("You are now in a surreal call with " + characterName + ". Tap the mic to start speaking, tap again when finished.");
      if (introLine && !conversationHistory.some((item) => item.role === "assistant")) {
        await speakCharacterReply(introLine);
      }
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
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopAvatarSpeaking();
    stopListening();
    setStatus("Call ended. Refresh or change character to start again.");
  }

  function setStatus(text) {
    if (statusEl) {
      statusEl.textContent = text || "";
    }
  }

  function setTranscript(text) {
    if (transcriptOverlay) {
      transcriptOverlay.textContent = text || "";
    }
  }

  function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus("Your browser does not support speech recognition. You can still watch and listen.");
      return;
    }

    recognition = new SR();
    recognition.lang = ttsLangHint || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
      isRecognizing = true;
      updateMicVisual(true);
      setStatus("Listening… speak as long as you like, then tap the button to finish.");
    };

    recognition.onerror = function (event) {
      console.error("Speech recognition error", event);
      isRecognizing = false;
      shouldKeepListening = false;
      updateMicVisual(false);
      setTranscript("");
      setStatus("Didn't quite catch that. Try again.");
    };

    recognition.onresult = function (event) {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      if (final) {
        lastFinalTranscript += (lastFinalTranscript ? " " : "") + final.trim();
      }
      const display = (lastFinalTranscript + " " + interim).trim();
      setTranscript(display);
    };

    recognition.onend = function () {
      isRecognizing = false;
      if (shouldKeepListening) {
        try {
          recognition.start();
        } catch (err) {
          console.error("Failed to resume recognition", err);
          shouldKeepListening = false;
          updateMicVisual(false);
        }
        return;
      }
      updateMicVisual(false);
      const text = (lastFinalTranscript || "").trim();
      lastFinalTranscript = "";
      setTranscript("");

      if (!text) {
        setStatus("No speech detected. Tap the mic again to retry.");
        return;
      }
      handleRecognizedText(text);
    };
  }

  function updateMicVisual(listeningState) {
    if (!micButton) return;
    const active = typeof listeningState === "boolean" ? listeningState : shouldKeepListening;
    if (active) {
      micButton.classList.add("listening");
      micButton.textContent = "Tap to finish";
    } else {
      micButton.classList.remove("listening");
      micButton.textContent = "Tap to talk";
    }
  }

  function startListening() {
    if (!recognition) {
      setStatus("Speech recognition is not available in this browser.");
      return;
    }
    if (shouldKeepListening) {
      shouldKeepListening = false;
      setStatus("Processing what you said…");
      updateMicVisual(false);
      stopListening();
      return;
    }
    shouldKeepListening = true;
    lastFinalTranscript = "";
    updateMicVisual(true);
    try {
      recognition.lang = ttsLangHint || "en-US";
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      shouldKeepListening = false;
      updateMicVisual(false);
      setStatus("Unable to start listening. Please try again.");
    }
  }

  function stopListening() {
    if (recognition) {
      try {
        recognition.stop();
      } catch (err) {
        console.error("Failed to stop speech recognition", err);
      }
    }
  }

  function handleRecognizedText(text) {
    if (!text) return;
    if (isRequestInFlight) {
      setStatus(characterName + " is still responding. Wait a moment, then ask again.");
      return;
    }
    sendToBackend(text);
  }

  async function sendToBackend(text) {
    isRequestInFlight = true;
    conversationHistory.push({ role: "user", content: text });
    setStatus(characterName + " is thinking…");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          character_id: characterId,
          history: conversationHistory,
        }),
      });

      if (!res.ok) {
        let errBody = {};
        try {
          errBody = await res.json();
        } catch (e) {
          // ignore
        }
        throw new Error(errBody.error || "Request failed with status " + res.status);
      }

      const data = await res.json();
      const reply = (data && data.reply) || "";
      if (reply) {
        await speakCharacterReply(reply);
        setStatus("");
      } else {
        setStatus(characterName + " was momentarily speechless. Try again.");
      }
    } catch (err) {
      console.error("Error talking to backend", err);
      setStatus("Something went wrong talking to " + characterName + ". Please try again.");
    } finally {
      isRequestInFlight = false;
    }
  }

  function segmentTextForSpeech(text) {
    if (!text) return [];
    // Simple segmentation on sentence boundaries.
    const raw = text.split(/([.!?]\s+)/g);
    const segments = [];
    let buffer = "";
    for (let i = 0; i < raw.length; i += 1) {
      buffer += raw[i];
      if (/[.!?]\s*/.test(raw[i])) {
        if (buffer.trim()) segments.push(buffer.trim());
        buffer = "";
      }
    }
    if (buffer.trim()) segments.push(buffer.trim());
    return segments.length ? segments : [text];
  }

  function chooseVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    let preferred = null;
    const keyword = (ttsVoiceKeyword || "").toLowerCase();
    const langHint = (ttsLangHint || "").toLowerCase();

    if (keyword) {
      preferred = voices.find(function (v) {
        const blob = (v.name || "") + " " + (v.voiceURI || "");
        return blob.toLowerCase().indexOf(keyword) !== -1;
      });
    }

    if (!preferred && langHint) {
      preferred = voices.find(function (v) {
        return (v.lang || "").toLowerCase().indexOf(langHint) === 0;
      });
    }

    if (!preferred) {
      preferred = voices.find(function (v) {
        return /en-|english/i.test(v.lang || "");
      });
    }

    return preferred || null;
  }

  async function speakCharacterReply(reply) {
    if (!("speechSynthesis" in window) || !reply) {
      return;
    }
    const segments = segmentTextForSpeech(reply);
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      // Only count as history once the segment begins playing,
      // so partial cutoffs do not add unheard text.
      // eslint-disable-next-line no-await-in-loop
      await speakSegment(seg);
    }
  }

  function speakSegment(text) {
    return new Promise(function (resolve) {
      if (!text || !text.trim()) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = chooseVoice();
      if (voice) {
        utterance.voice = voice;
      }
      const profile = VOICE_STYLES[characterId] || {};
      const rateVariation = ((Math.random() - 0.5) * 0.04);
      const pitchVariation = ((Math.random() - 0.5) * 0.05);
      utterance.rate = profile.rate ? profile.rate + rateVariation : 1.0 + rateVariation;
      utterance.pitch = profile.pitch ? profile.pitch + pitchVariation : 1.0 + pitchVariation;
      utterance.volume = profile.volume ?? 1.0;

      utterance.onstart = function () {
        startAvatarSpeaking(text);
        conversationHistory.push({ role: "assistant", content: text });
      };
      utterance.onend = function () {
        stopAvatarSpeaking();
        resolve();
      };
      utterance.onerror = function () {
        stopAvatarSpeaking();
        resolve();
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("TTS error", err);
        resolve();
      }
    });
  }

  function startAvatarSpeaking(text) {
    document.body.classList.add("avatar-speaking");
    if (remoteTile) {
      remoteTile.classList.add("avatar-speaking");
    }
    if (avatarMouth) {
      avatarMouth.setAttribute("data-utterance-length", String(text ? text.length : 0));
    }
  }

  function stopAvatarSpeaking() {
    document.body.classList.remove("avatar-speaking");
    if (remoteTile) {
      remoteTile.classList.remove("avatar-speaking");
    }
    if (avatarMouth) {
      avatarMouth.removeAttribute("data-utterance-length");
    }
  }

  function openCharacterModal() {
    if (!modalBackdrop || !modalEl) return;
    modalBackdrop.hidden = false;
    modalBackdrop.classList.add("visible");
    if (searchInput) {
      searchInput.value = "";
      filterCharacters("");
      searchInput.focus();
    }
  }

  function closeCharacterModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove("visible");
    modalBackdrop.hidden = true;
  }

  function filterCharacters(query) {
    if (!modalEl) return;
    const q = (query || "").toLowerCase();
    const options = modalEl.querySelectorAll(".character-option");
    options.forEach(function (btn) {
      const name = (btn.getAttribute("data-name") || "").toLowerCase();
      const bio = (btn.getAttribute("data-bio") || "").toLowerCase();
      const match = !q || name.indexOf(q) !== -1 || bio.indexOf(q) !== -1;
      btn.style.display = match ? "block" : "none";
    });
  }

  function setupCharacterPicker() {
    if (!pickerToggle || !modalEl || !modalBackdrop) return;

    pickerToggle.addEventListener("click", function () {
      openCharacterModal();
    });
    pickerToggle.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCharacterModal();
      }
    });

    if (modalClose) {
      modalClose.addEventListener("click", function () {
        closeCharacterModal();
      });
    }

    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", function (event) {
        if (event.target === modalBackdrop) {
          closeCharacterModal();
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", function (event) {
        filterCharacters(event.target.value || "");
      });
    }

    const options = modalEl.querySelectorAll(".character-option");
    options.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-id");
        if (!id) return;
        const url = new URL(window.location.href);
        url.searchParams.set("character_id", id);
        window.location.href = url.toString();
      });
    });
  }

  function setupUi() {
    if (endCallButton) {
      endCallButton.addEventListener("click", function () {
        endCall();
      });
    }

    if (micButton) {
      micButton.addEventListener("click", function () {
        startListening();
      });
    }

    setupCharacterPicker();
    initSpeechRecognition();

    // Start background fidgets for the remote avatar to add subtle movement.
    startAvatarFidgets();
  }

  window.addEventListener("load", function () {
    setupUi();
    startCall();
  });
})();

function startAvatarFidgets() {
  const remoteTile = document.getElementById("remoteTile");
  if (!remoteTile) return;

  function scheduleNext() {
    const delay = 2000 + Math.random() * 6000; // between ~2s and 8s
    setTimeout(function () {
      if (!document.body.contains(remoteTile)) return;
      remoteTile.classList.add("avatar-fidget");
      setTimeout(function () {
        remoteTile.classList.remove("avatar-fidget");
        scheduleNext();
      }, 700 + Math.random() * 600);
    }, delay);
  }

  scheduleNext();
}
