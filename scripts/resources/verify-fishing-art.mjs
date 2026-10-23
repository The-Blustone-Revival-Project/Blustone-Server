import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const FISHING_ART_SOURCE=Object.freeze({
  pack:'resources/runtime/assets/FISH_LIST.jet',bytes:562972,
  sha256:'ad5bedcc5cbea02dfe2a287374e70cd2261c2b5a212fdc124393ef908a19f18c',
  index:'resources/reference/fish-list-original-jet-index.json',
  indexSha256:'9192aedf0aa960d42a0632502f6b0f0a4eb8f8580afc6ba6d3f25179f91cf991',
});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

/** Original sprite/dependency proof only. No species, item ID, pool, selected
 * runtime package or native-rendering claim follows from a thumbnail name. */
export function verifyOriginalFishingArt(pack,index,thumbnail) {
  assert.ok(Buffer.isBuffer(pack)&&Buffer.isBuffer(index),'Original fishing pack/index bytes required');
  assert.equal(pack.length,FISHING_ART_SOURCE.bytes);assert.equal(hash(pack),FISHING_ART_SOURCE.sha256);
  assert.equal(hash(index),FISHING_ART_SOURCE.indexSha256);
  const report=JSON.parse(index.toString('utf8'));
  assert.equal(report.schema,1);assert.equal(report.format,'native-jet-base38-index');
  assert.equal(report.bytes,pack.length);assert.equal(report.sha256,FISHING_ART_SOURCE.sha256);
  assert.equal(report.exact_eof,pack.length);assert.equal(report.physical_chunks,90);assert.equal(report.resource_count,90);
  assert.equal(report.resources.length,90);
  const resources=new Map();
  for(const row of report.resources) {
    assert.ok(!resources.has(row.name),'Original fishing resource names must be unique');resources.set(row.name,row);
    for(const chunk of row.chunks) {
      assert.equal(pack.subarray(chunk.offset,chunk.offset+24).toString('hex'),chunk.header_hex);
      assert.equal(pack.readBigUInt64LE(chunk.offset+12).toString(),row.encoded_name);
    }
  }
  assert.equal(typeof thumbnail,'string');assert.ok(thumbnail.length>0,'A blank thumbnail would request missing _V');
  return [thumbnail,thumbnail+'_V'].map(name=>{
    const sprite=resources.get(name);assert.ok(sprite,'Missing original sprite '+name);
    assert.equal(sprite.payload_prefix_hex,'5332');assert.equal(sprite.s2projection?.supported,true);
    const images=sprite.s2projection.images;assert.equal(images?.length,1,'Practice art requires one source-backed image');
    const image=resources.get(images[0].image_name);assert.ok(image,'Missing local image dependency '+name);
    assert.equal(image.payload_prefix_hex,'4932','Sprite dependency must be an original I2 image');
    assert.equal(image.encoded_name,images[0].image_encoded_name);assert.equal(image.sha256,images[0].image_sha256);
    assert.equal(image.decoded_bytes,images[0].image_decoded_bytes);
    return {name,sha256:sprite.sha256,image:image.name,imageSha256:image.sha256};
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const itemsFile=process.argv[2]??'config/policies/fishing-practice-items.json';
  assert.ok(process.argv.length<=3,'Supply only an optional item-definition file');
  const pack=readFileSync(path.join(root,FISHING_ART_SOURCE.pack)),index=readFileSync(path.join(root,FISHING_ART_SOURCE.index));
  const items=JSON.parse(readFileSync(path.resolve(root,itemsFile),'utf8'));
  assert.ok(Array.isArray(items)&&items.length>0);
  for(const item of items)console.log(JSON.stringify({item:item.id,art:verifyOriginalFishingArt(pack,index,item.thumbnail_id),nativeRendering:'unverified'}));
}
