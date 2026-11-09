/* Speaker notes from Tri-U_2026_Script_Dandy.pdf (KLIK = [click]); generated */
window.NOTES = {
 "1": {
  "time": "0:00 – 0:25",
  "text": "Good morning everyone, and thank you to Chiang Mai University for having us. My name is Dandy, from the Department of Bioinformatics at IPB University, Indonesia. This work is with Professor Wisnu Ananta Kusuma. Let me start with the disease. [click → next slide]"
 },
 "2": {
  "time": "0:25 – 1:05",
  "text": "Fifteen months. [pause] That is the median survival for glioblastoma, the most aggressive tumour that starts in the brain. Half of patients live less than that, even with standard treatment. [click] One reason it grows so fast is that it builds its own blood supply. So how does a tumour do that? [click → next slide]"
 },
 "3a": {
  "time": "1:05 – 1:45",
  "text": "A tumour grows faster than its own blood supply. [click] So it releases a signal, a protein called VEGF, that makes new blood vessels grow into it. [click] But a signal only works when it lands on a receiver. The main receiver is VEGFR-2, on the wall of the blood vessel. The gene that builds it is called KDR. [click] The result is new vessels growing into the tumour. This is angiogenesis. [click → next slide]"
 },
 "3b": {
  "time": "1:45 – 2:25",
  "text": "This is where the drugs come in. [click] Bevacizumab is an antibody. It grabs VEGF before the signal can reach VEGFR-2. No signal, fewer new vessels, so the tumour gets less of the blood supply it needs. It is used for glioblastoma that comes back after treatment. [click] Other drugs block the receiver itself, from the inside. We will see that pocket later. So this pathway matters for treatment, and measuring KDR gives us one window into how active it is in a tumour. The problem is how we measure it today. [click → next slide]"
 },
 "4": {
  "time": "2:25 – 3:25",
  "text": "Today, the angiogenic state of a tumour is read from tissue. Someone has to take a piece of the tumour in surgery. That carries risk, and it cannot easily be repeated as the tumour changes. [pause] But every one of these patients already has an MRI scan. So our question was simple: can we tell a patient's KDR level from the MRI alone, without tissue? [click] To test it, we used public data: ninety-one glioblastoma patients with both MRI and gene data. We split them at the middle of KDR expression: forty-six high, forty-five low. [click] No new scans, no new procedures. Here is how we tested it. [click → next slide]"
 },
 "5": {
  "time": "3:25 – 4:40",
  "text": "Three steps: image, gene, structure. [click] Image. An MRI is a grid of numbers. Radiomics software turns it into measurements we can name: how rough the tumour edge is, how round the shape is, how even the brightness is. Hundreds of them per patient, from four MRI sequences. [click] Gene. For each measurement we ask: does it rise and fall together with KDR? Because we test so many at once, we correct for chance. Then a model, a random forest, sorts patients into high or low, and we test it only on patients it has never seen. [click] Structure. Finally, we look at the VEGFR-2 protein itself, at the pocket where drugs bind. Let me start the results with the protein. [click → next slide]"
 },
 "6a": {
  "time": "4:40 – 5:00",
  "text": "This is the VEGFR-2 kinase domain, from a published crystal structure, PDB 2OH4. The coloured molecule is an inhibitor, sitting in the pocket where ATP normally binds. [click → next slide]"
 },
 "6b": {
  "time": "5:00 – 5:35",
  "text": "Eight residues line that pocket. [click] Two landmarks: the gatekeeper, valine nine-fourteen, [click] and the DFG motif, aspartate ten-forty-four and phenylalanine ten- forty-five. [click] This gives us molecular context for what KDR builds. It is a visualisation, not a link to the imaging model. Now, back to the question we started with. [click → next slide]"
 },
 "7": {
  "time": "5:35 – 6:55",
  "text": "Can MRI tell us whether a patient is high or low in KDR? [click] On patients it had never seen, the model scored an AUC of zero point four nine seven. [click] Zero point five means guessing. [click] So with this data: not yet. [pause] In practical terms: if a hospital used this model, about half of the patients would be put in the wrong group. That does not mean the images hold nothing. Some MRI measurements do move with KDR, but weakly. Too weakly to decide for a single patient. So why not yet? [click → next slide]"
 },
 "8": {
  "time": "6:55 – 8:15",
  "text": "We see three reasons. [click] First, the data is small. Ninety-one patients from one cohort, with no outside group to check against, and scans that were not harmonised across scanners. With so few patients, a model can easily learn noise. [click] Second, the answer depends on how the measurements are made. We made them twice from the same images: once with the set that comes with the public archive, once with our own software. After correcting for chance, the first found zero links to KDR; the second found four hundred and seventy-nine. [pause] Same images, different answers. The two sets also differ in patients and definitions, so we cannot blame the software alone. But there is no consensus yet. [click] Third, the signal is weak. KDR is one gene, and what an MRI shows is shaped by many processes at once. Its signal may be mixed with others. Which tells us what to do next. [click → next slide]"
 },
 "9": {
  "time": "8:15 – 9:15",
  "text": "So, what next? [click] First, repeat this in a larger, independent cohort from several hospitals, with the same two safeguards: correcting for chance, and testing only on unseen patients. The lead worth following is a FLAIR feature from the dead core of the tumour. [click] Second, try models built to find weak signals in small data, and add signals from other genes, not only KDR. [click] So the message is simple. For now, MRI cannot replace tissue for reading KDR. Reading a tumour's biology from an image is harder than it looks, and one model on one gene is not enough. [click → next slide]"
 },
 "10": {
  "time": "9:15 – 9:35",
  "text": "That is my talk. Thank you. ขอบคุณครับ (khob khun khrap) I have backup slides on the validation, the software comparison and the protein structure, if you would like to ask about any of them. [Stand still and wait for the first question.]"
 }
};
