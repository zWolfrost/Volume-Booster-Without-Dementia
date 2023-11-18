"use strict"

const DOMAIN_TEXT = document.getElementById("domain-text");
const GLOBAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("global-volume-multiplier-range");
const GLOBAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("global-volume-multiplier-counter");
const LOCAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("local-volume-multiplier-range");
const LOCAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("local-volume-multiplier-counter");
const FLIP_GLOBAL_SOUND_MODE = document.getElementById("flip-global-sound-mode");
const FLIP_LOCAL_SOUND_MODE = document.getElementById("flip-local-sound-mode");
const DELETE_LOCAL_VOLUME_OPTIONS = document.getElementById("delete-local-volume-multiplier");


class NoteFlipper
{
   constructor(button, callback)
   {
      this.button = button;

      this.button.addEventListener("click", () =>
      {
         this.isMono = !this.isMono

         callback(this.isMono)
      })
   }

   get isMono()
   {
      return this.button.classList.contains("quaver")
   }
   set isMono(mono)
   {
      this.button.classList.remove("quaver", "beam")
      this.button.classList.add(mono ? "quaver" : "beam")
   }
}


(async () =>
{
   function getURL()
   {
      return new Promise((resolve, reject) =>
         chrome.tabs.query({active: true, currentWindow: true}, tabs => resolve(tabs[0]?.url))
      );
   }

   function updateInputs()
   {
      browser.storage.local.get().then(storage =>
      {
         const localIsAvailable = domain && storage[domain];
         const domainGlobalFallback = localIsAvailable ? domain : "global";

         globalVolumeOptions.forEachInput(input => input.max = storage.options.volumeMultiplierPercentLimit)
         localVolumeOptions.forEachInput(input => input.max = storage.options.volumeMultiplierPercentLimit)

         globalVolumeOptions.forEachInput(input => input.value = storage.global.volumeMultiplierPercent)
         localVolumeOptions.forEachInput(input => input.value = storage[domainGlobalFallback].volumeMultiplierPercent)

         globalMonoNoteFlipper.isMono = storage.global.mono
         localMonoNoteFlipper.isMono = storage[domainGlobalFallback].mono

         localVolumeOptions.enabled = localIsAvailable
      })
   }

   function setGlobalVolumeOptions()
   {
      browser.storage.local.set({
         global: {
            volumeMultiplierPercent: +globalVolumeOptions.inputs[0].value,
            mono: globalMonoNoteFlipper.isMono
         },
      })
   }
   function setLocalVolumeOptions()
   {
      browser.storage.local.set({
         [domain]: {
            volumeMultiplierPercent: +localVolumeOptions.inputs[0].value,
            mono: localMonoNoteFlipper.isMono
         },
      })
   }


   const url = await getURL();
   const domain = url ? new URL(url)?.hostname : url


   const localVolumeOptions = new VolumeOptions([LOCAL_VOLUME_MULTIPLIER_COUNTER, LOCAL_VOLUME_MULTIPLIER_RANGE], value =>
   {
      localVolumeOptions.enabled = true

      setLocalVolumeOptions()
   }, {links: [FLIP_LOCAL_SOUND_MODE, DELETE_LOCAL_VOLUME_OPTIONS]})

   const globalVolumeOptions = new VolumeOptions([GLOBAL_VOLUME_MULTIPLIER_COUNTER, GLOBAL_VOLUME_MULTIPLIER_RANGE], value =>
   {
      if (!localVolumeOptions.enabled)
      {
         localVolumeOptions.forEachInput(input => input.value = value)
      }

      setGlobalVolumeOptions()
   }, {links: [FLIP_GLOBAL_SOUND_MODE]})



   const localMonoNoteFlipper = new NoteFlipper(FLIP_LOCAL_SOUND_MODE, () =>
   {
      localVolumeOptions.enabled = true

      setLocalVolumeOptions()
   })

   const globalMonoNoteFlipper = new NoteFlipper(FLIP_GLOBAL_SOUND_MODE, isMono =>
   {
      if (!localVolumeOptions.enabled)
      {
         localMonoNoteFlipper.isMono = isMono
      }

      setGlobalVolumeOptions()
   })



   if (domain)
   {
      DOMAIN_TEXT.innerText = domain;
      DOMAIN_TEXT.classList.add("url");

      GLOBAL_VOLUME_MULTIPLIER_RANGE.style.maxWidth = LOCAL_VOLUME_MULTIPLIER_RANGE.offsetWidth + "px";


      DELETE_LOCAL_VOLUME_OPTIONS.addEventListener("click", () =>
      {
         localVolumeOptions.enabled = false
         localVolumeOptions.forEachInput(input => input.value = globalVolumeOptions.inputs[0].value)

         localMonoNoteFlipper.isMono = globalMonoNoteFlipper.isMono

         browser.storage.local.remove(domain)
      })
   }
   else
   {
      LOCAL_VOLUME_MULTIPLIER_RANGE.parentElement.classList.add("hidden");
      document.querySelectorAll(".fake").forEach(node => node.classList.add("hidden"))
   }


   updateInputs();
})()