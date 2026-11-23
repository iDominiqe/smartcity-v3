/**
 * Two-Stage UI-First GPU Preloader (v3 SolarSync Frosted Edition)
 * Paints the frosted UI overlay immediately, then executes staged async WebGL
 * construction and shader compilation while reporting GPU buffer progress.
 */

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 16));
  });
}

export class GPUPreloader {
  constructor({
    overlayId = 'gpu-preloader',
    pctId = 'preloader-pct',
    fillId = 'preloader-fill',
    stepId = 'preloader-step',
    stageId = 'preloader-stage',
    buffersId = 'preloader-buffers',
    profileId = 'preloader-profile'
  } = {}) {
    this.overlay = document.getElementById(overlayId);
    this.pctEl = document.getElementById(pctId);
    this.fillEl = document.getElementById(fillId);
    this.stepEl = document.getElementById(stepId);
    this.stageEl = document.getElementById(stageId);
    this.buffersEl = document.getElementById(buffersId);
    this.profileEl = document.getElementById(profileId);
    this.totalBuffers = 32;
  }

  setProfileLabel(label) {
    if (this.profileEl) {
      this.profileEl.textContent = label;
    }
  }

  updateUI({ pct, stepText, stageIndex, totalStages, buffersLoaded }) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (this.pctEl) this.pctEl.textContent = `${clamped}%`;
    if (this.fillEl) this.fillEl.style.width = `${clamped}%`;
    if (this.stepEl && stepText) this.stepEl.textContent = stepText;
    if (this.stageEl && stageIndex !== undefined) {
      this.stageEl.textContent = `${stageIndex} / ${totalStages}`;
    }
    if (this.buffersEl && buffersLoaded !== undefined) {
      this.buffersEl.textContent = `${buffersLoaded} / ${this.totalBuffers}`;
    }
  }

  async run(tasks, { renderer, scene, camera, doneLabel = 'Ready' } = {}) {
    await nextFrame();
    await nextFrame();

    const total = tasks.length;
    let accumulatedBuffers = 0;

    for (let i = 0; i < total; i++) {
      const task = tasks[i];
      const basePct = (i / total) * 85;
      this.updateUI({
        pct: basePct + 4,
        stepText: task.label,
        stageIndex: i + 1,
        totalStages: total,
        buffersLoaded: accumulatedBuffers
      });

      await nextFrame();
      const added = await task.fn();
      if (typeof added === 'number') {
        accumulatedBuffers += added;
      } else if (renderer?.info?.memory) {
        accumulatedBuffers = Math.max(accumulatedBuffers, renderer.info.memory.geometries);
      }

      this.updateUI({
        pct: ((i + 1) / total) * 85,
        stepText: task.label,
        stageIndex: i + 1,
        totalStages: total,
        buffersLoaded: accumulatedBuffers
      });
    }

    if (renderer && scene && camera) {
      this.updateUI({
        pct: 92,
        stepText: tasks[total - 1]?.label || doneLabel,
        stageIndex: total,
        totalStages: total,
        buffersLoaded: renderer.info?.memory?.geometries || accumulatedBuffers
      });
      await nextFrame();
      renderer.compile(scene, camera);
      renderer.render(scene, camera);
    }

    const finalGeoCount = renderer?.info?.memory?.geometries || accumulatedBuffers || this.totalBuffers;
    this.totalBuffers = Math.max(this.totalBuffers, finalGeoCount);

    this.updateUI({
      pct: 100,
      stepText: doneLabel,
      stageIndex: total,
      totalStages: total,
      buffersLoaded: finalGeoCount
    });

    await new Promise((r) => setTimeout(r, 180));
    if (this.overlay) {
      this.overlay.classList.add('is-ready');
    }

    return finalGeoCount;
  }
}
