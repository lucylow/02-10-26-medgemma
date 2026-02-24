class MedicalUI {
  static createRiskBadge(level, confidence) {
    const prettyLevel = level.toUpperCase();
    const safeConfidence = Number.isFinite(confidence) ? confidence : 0;
    return `
      <div class="risk-badge risk-${level}">
        <strong>${prettyLevel}</strong>
        <small>${safeConfidence}% confidence</small>
      </div>
    `;
  }

  static createEvidenceRow(evidence) {
    if (!evidence) return "";
    const influence = Number.isFinite(evidence.influence) ? evidence.influence : 0;
    const influencePct = Math.round(influence * 100);
    return `
      <div class="evidence-row">
        <span class="evidence-type">${evidence.type}</span>
        <span>${evidence.content}</span>
        <span class="influence">${influencePct}%</span>
      </div>
    `;
  }

  static showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");
    if (type === "success") {
      icon.className = "fa-solid fa-circle-check";
    } else if (type === "error") {
      icon.className = "fa-solid fa-triangle-exclamation";
    } else {
      icon.className = "fa-solid fa-circle-info";
    }

    const text = document.createElement("span");
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-leaving");
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }
}

