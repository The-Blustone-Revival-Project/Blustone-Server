#!/usr/bin/env python3
"""Read-only E10 graph/resource audit over retained originals; no native play claim."""
import hashlib
import importlib.util
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('jet_index', Path(__file__).with_name('jet-index.py'))
jet = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jet)


def original(name):
    data = (ROOT / 'resources/runtime/assets' / name).read_bytes()
    return data, jet.index_jet(data)


def audit():
    profile = json.loads((ROOT / 'config/profiles/current-e10.json').read_text())
    selected = set(profile['env']['BLUSTONE_PACKAGE_NAMES'].split(','))
    data, index = original('DIAL-EN.jet')
    records = {r['name']: r for r in index['resources']}
    names = [f'EP_170{i}A' for i in range(1, 8)] + ['EP_1704B', 'EP_1706B']
    dialogs, needed, characters = [], set(), set()
    for name in names:
        record = records[name]
        raw = b''.join(jet.inflate_chunk(data[c['payload_offset']:c['payload_offset'] + c['stored_bytes']],
                                        c['raw_bytes']) for c in record['chunks'])
        if raw[:2] != b'RW' or int.from_bytes(raw[2:6], 'little') != len(raw) - 6:
            raise ValueError('Original dialogue RW length mismatch')
        xml = ET.fromstring(raw[6:])
        entries = xml.findall('.//DialogEntry')
        nodes = {e.attrib['ID']: e for e in entries}
        roots = [e.attrib['ID'] for e in entries if e.attrib.get('IsRoot') == 'true']
        if len(nodes) != len(entries) or len(roots) != 1:
            raise ValueError('Original dialogue requires unique nodes and one root')
        reached, pending = set(), roots[:]
        while pending:
            key = pending.pop()
            if key in reached:
                continue
            node = nodes[key]
            reached.add(key)
            pending.extend(link.attrib['DestinationDialogID'] for link in node.findall('./OutgoingLinks/Link'))
        if reached != set(nodes):
            raise ValueError('Original dialogue contains unreachable nodes')
        actor_map = {a.attrib['ID']: {f.findtext('Title'): f.findtext('Value') for f in a.findall('./Fields/Field')}
                     for a in xml.findall('.//Actor')}
        used = {f.findtext('Value') for node in nodes.values() for f in node.findall('./Fields/Field')
                if f.findtext('Title') in ('Actor', 'Conversant')}
        for key in used - {'999'}:  # Original narrator sentinel, not an owned Hunter.
            actor = actor_map[key]
            if actor['CardType'] != 'Char':
                raise ValueError('Uninspected dialogue actor type')
            characters.add(actor['CardID'])
        scripts = '\n'.join(e.text or '' for e in xml.findall('.//UserScript'))
        needed.update(re.findall(r'(?:bg-add|play-bgm)\s+res:\s*([A-Z0-9_]+)', scripts))
        dialogs.append({'name': name, 'nodes': len(nodes), 'reachable': len(reached),
                        'xml_sha256': hashlib.sha256(raw[6:]).hexdigest()})
    owners = {}
    for name in ['DIAL_BG.jet', 'DIAL_BG2.jet', 'DIAL_BG9.jet', 'SND1.jet', 'SND_CDN.jet',
                 'CUT_E1001.jet', 'CUT_E1002.jet', 'CUT_E1003.jet']:
        if name not in selected:
            raise ValueError('Required dialogue package not selected: ' + name)
        _, contents = original(name)
        for record in contents['resources']:
            if record['name'] in needed:
                owners.setdefault(record['name'], []).append(name)
    if needed != set(owners):
        raise ValueError('Unresolved literal dialogue resource: ' + str(needed - set(owners)))
    for card in characters:
        for suffix in ['', '_Q', '_SND']:
            if 'C' + card + suffix + '.jet' not in selected:
                raise ValueError('Dialogue character package not selected: ' + card + suffix)
    return {'scope': 'Original E10 dialogue links, literal bg/BGM owners and character package selection; native execution pending',
            'dialogue_pack_sha256': index['sha256'], 'dialogs': dialogs,
            'characters': sorted(characters), 'literal_resource_owners': owners}


if __name__ == '__main__':
    print(json.dumps(audit(), indent=2))
