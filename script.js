let synth, lfo, gain;
let droneSynth, droneGain, droneInterval;
let keySynth;
let lastScrollY = 0;
let isPlaying = false;
let dronePlaying = false;
let scrollTimeout;
const pressedKeys = new Map();

document.getElementById("start-button").addEventListener("click", async () => {
    await Tone.start();
    gain = new Tone.Gain(0).toDestination();
    synth = new Tone.MonoSynth({
        oscillator: { type: "triangle" },
        filter: { type: "lowpass", frequency: 50, Q: 1 },
        envelope: { attack: 0.1, decay: 0.1, sustain: 1, release: 0.5 },
    }).connect(gain);
    lfo = new Tone.LFO({ type: "sine", frequency: 0, min: 0, max: 0.6 }).connect(gain.gain);
    lfo.start();
    const reverb = new Tone.Reverb({ decay: 5, wet: 0.8 }).toDestination();
    keySynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" } }).connect(reverb);
});

document.getElementById("toggle-drone").addEventListener("click", () => {
    if (!droneGain) {
        droneGain = new Tone.Gain(0.5).toDestination();
        const reverb = new Tone.Reverb({ decay: 250, wet: 0.9 });
        const postReverbGain = new Tone.Gain(0.4);
        reverb.connect(postReverbGain);
        postReverbGain.connect(droneGain);
        droneSynth = new Tone.Oscillator({ type: "triangle", frequency: 0 }).connect(reverb);
    }

    if (!dronePlaying) {
        console.log("Starting drone...");
        droneSynth.start();
        const pitches = ["F2", "G2", "D3", "C3"];
        let index = 0;

        const playNote = () => {
            const frequency = Tone.Frequency(pitches[index]).toFrequency();
            droneSynth.frequency.rampTo(frequency, 1);
            setTimeout(() => droneSynth.frequency.rampTo(0, 0.5), 3000);
            index = (index + 1) % pitches.length;
        };

        playNote();
        droneInterval = setInterval(playNote, 8000);

        dronePlaying = true;
    } else {
        console.log("Stopping drone...");
        clearInterval(droneInterval);
        droneSynth.stop();
        droneGain.gain.rampTo(0, 0.5); // Smoothly ramp gain to zero
        dronePlaying = false;

        // Reset the gain and oscillator for reuse
        setTimeout(() => {
            droneSynth.dispose(); // Fully reset the oscillator
            droneGain.dispose(); // Fully reset the gain node
            droneSynth = null;
            droneGain = null;
        }, 1000); // Ensure ramp completes
    }
});

document.getElementById("random-mix-button").addEventListener("click", () => {
    if (!synth || !lfo) return;

    const randomNote = Tone.Frequency(Math.floor(Math.random() * 48 + 40), "midi").toFrequency();
    console.log(`Random Note: ${randomNote}`);

    synth.oscillator.frequency.value = randomNote;

    const randomLFOFreq = Math.random() * 10;
    lfo.frequency.value = randomLFOFreq;
    console.log(`Random LFO Frequency: ${randomLFOFreq}`);

    lfo.min = Math.random() * 0.5;
    lfo.max = Math.random();
    console.log(`Random LFO Amplitude: min=${lfo.min}, max=${lfo.max}`);

    const randomCutoff = Math.random() * 5000 + 50;
    const randomQ = Math.random() * 10;
    synth.filter.set({
        frequency: randomCutoff,
        Q: randomQ,
    });
    console.log(`Random Filter Cutoff: ${randomCutoff}, Q: ${randomQ}`);

    synth.triggerAttackRelease(randomNote, 1);
});

window.addEventListener("keydown", (event) => {
    if (!keySynth || pressedKeys.has(event.key)) return;
    const notes = ["F4", "A4", "D5", "E5", "F5", "A6"];
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    pressedKeys.set(event.key, randomNote);
    keySynth.triggerAttack(randomNote);
});

window.addEventListener("keyup", (event) => {
    if (!keySynth || !pressedKeys.has(event.key)) return;
    const note = pressedKeys.get(event.key);
    keySynth.triggerRelease(note);
    pressedKeys.delete(event.key);
});

function map(value, inMin, inMax, outMin, outMax) {
    if (typeof value !== "number" || isNaN(value)) return outMin;
    return Math.max(outMin, Math.min(outMax, ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin));
}

function handleScroll() {
    if (!synth || !lfo || !gain) return;
    const currentScrollY = window.scrollY;
    const scrollSpeed = Math.abs(currentScrollY - lastScrollY) || 0;
    const mappedLFOFrequency = map(scrollSpeed, 0, 100, 0, 40);
    lfo.frequency.value = mappedLFOFrequency;
    if (scrollSpeed > 0) {
        if (!isPlaying) {
            synth.triggerAttack("C4");
            isPlaying = true;
        }
    }
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if (isPlaying) {
            synth.triggerRelease();
            isPlaying = false;
            setTimeout(() => (gain.gain.value = 0), 1000);
        }
    }, 150);
    const mappedCutoff = map(scrollSpeed, 0, 100, 50, 5000);
    const mappedResonance = map(scrollSpeed, 0, 100, 1, 10);
    synth.filter.set({ frequency: mappedCutoff, Q: mappedResonance });
    lastScrollY = currentScrollY;
}

const startButton = document.getElementById("start-button");
const toggleDroneButton = document.getElementById("toggle-drone");

window.addEventListener("scroll", handleScroll);
