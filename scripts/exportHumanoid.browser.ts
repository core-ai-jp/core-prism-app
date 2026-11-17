import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createHumanoid, disposeHumanoid } from '../src/corporate/robots/createHumanoid';

/** Dev-server browser helper: export the same original concept shown on the page. */
export async function exportHumanoid():Promise<ArrayBuffer> {
  const model=await createHumanoid();
  try {return await new GLTFExporter().parseAsync(model,{binary:true}) as ArrayBuffer;}
  finally {disposeHumanoid(model);}
}
