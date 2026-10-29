# Measurement definitions

- Registration: unique email/resource/event/campaign receipt, not number of POST requests. Multiple resources can count more than one registration per lead.
- Download: server-served file for a receipt, counted once; does not prove the person read it.
- Verified: email ownership link consumed. Marketing consent: current verified, non-withdrawn Hub permission. These are not the same metric.
- Source: explicit event_id/campaign_id/UTM, retained only for the current tab. Invalid/missing source is unknown.
- Consultation click is not a booking. TimeRex confirmed booking adapter is not connected, so confirmed booking is unmeasured.
- CRM contract, tax basis and revenue are not inferred. Revenue and ROAI conversion report remain unmeasured until an authorized CRM adapter supplies confirmed records.
- Admin supports month/event/resource filters and aggregate CSV without names/emails. Visits and registration rate are explicitly unavailable pending privacy-reviewed traffic instrumentation.

Next operating review: registration completion, download completion, opt-in rate, delivery failure, confirmed booking rate and verified contracted revenue. Do not divide by an unknown denominator or report unknown as zero.
