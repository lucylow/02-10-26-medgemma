{{/*
  pediagents fullname (release-name-namespace truncated)
*/}}
{{- define "pediagents.fullname" -}}
{{- printf "%s-%s" .Release.Name .Values.namespace | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
  Chart name (pediagents)
*/}}
{{- define "pediagents.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{/*
  ServiceAccount name (pediagents-sa when serviceAccount.create is true)
*/}}
{{- define "pediagents.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- include "pediagents.name" . }}-sa
{{- else -}}
default
{{- end -}}
{{- end -}}

