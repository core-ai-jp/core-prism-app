"""Generate an event QR without external calls. python createHubCampaign.py EVENT CAMPAIGN OUTDIR"""
import re,sys,json
from pathlib import Path
from urllib.parse import urlencode
import qrcode
if len(sys.argv)!=4 or not all(re.fullmatch(r'[A-Za-z0-9_-]{1,80}',x) for x in sys.argv[1:3]):raise SystemExit('Usage: EVENT_ID CAMPAIGN_ID OUTDIR (alphanumeric, dash, underscore)')
event,campaign,out=sys.argv[1:];p=Path(out);p.mkdir(parents=True,exist_ok=True)
u='https://www.core-ai.jp/resources/harness-starter-kit?'+urlencode({'event_id':event,'campaign_id':campaign,'utm_source':'lecture','utm_medium':'qr','utm_campaign':campaign})
q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=10,border=4);q.add_data(u);q.make(fit=True);q.make_image(fill_color='black',back_color='white').save(p/'lecture-qr.png');(p/'campaign.json').write_text(json.dumps({'event_id':event,'campaign_id':campaign,'url':u,'status':'test_until_published_and_device_verified'},indent=2)+'\n');print(u)
