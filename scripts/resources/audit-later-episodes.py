#!/usr/bin/env python3
"""Read-only E11..E18 graph/literal-resource census, not native play validation."""
import hashlib
import csv
import importlib.util
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('jet_index', Path(__file__).with_name('jet-index.py'))
jet = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jet)


def hashed_json(name):
    data = (ROOT / name).read_bytes()
    return json.loads(data), hashlib.sha256(data).hexdigest()


def literal_owners(wanted):
    owners = {name: [] for name in sorted(wanted)}
    scanned = 0
    for file in sorted((ROOT / 'resources/runtime/assets').glob('*.jet')):
        size = file.stat().st_size
        if not 0 < size <= jet.MAX_FILE:
            raise ValueError('Original JET file size outside bounded census')
        position = 0
        with file.open('rb') as stream:
            while position < size:
                header = stream.read(jet.HEADER.size)
                if len(header) != jet.HEADER.size:
                    raise ValueError('Truncated original JET header: ' + file.name)
                whole, raw, stored, encoded, part, _ = jet.HEADER.unpack(header)
                name = jet.decode_name(encoded)
                if not whole or not raw or not stored or raw > whole or position + jet.HEADER.size + stored > size:
                    raise ValueError('Invalid original JET header: ' + file.name)
                if part == 0 and name in owners and file.name not in owners[name]:
                    owners[name].append(file.name)
                stream.seek(stored, 1)
                position += jet.HEADER.size + stored
        if position != size:
            raise ValueError('Original JET census did not reach exact EOF')
        scanned += 1
    return owners, scanned


def audit():
    season, season_hash = hashed_json('resources/reference/episodes/EPISODE_S01.json')
    stat_rows, stat_hash = hashed_json('resources/reference/episodes/EPISODE_STAT_ACTORS.json')
    env_path = ROOT / 'resources/reference/recovered-data/environments.csv'
    with env_path.open(encoding='utf-8', newline='') as stream:
        environments = {row['#ID']: row['PreFix'] for row in csv.DictReader(stream)}
    profile, _ = hashed_json('config/profiles/current-e10-expanded-character-progression.json')
    selected = set(profile['env']['BLUSTONE_PACKAGE_NAMES'].split(','))
    data = (ROOT / 'resources/runtime/assets/DIAL-EN.jet').read_bytes()
    index = jet.index_jet(data)
    by_name = {r['name']: r for r in index['resources']}
    chapters, all_resources, all_actors = [], set(), set()
    common_losses, parsed = set(), {}

    def decode_dialogue(name):
        if name in parsed:
            return parsed[name]
        row = by_name[name]
        raw = b''.join(jet.inflate_chunk(data[c['payload_offset']:c['payload_offset'] + c['stored_bytes']],
                                        c['raw_bytes']) for c in row['chunks'])
        if raw[:2] != b'RW' or int.from_bytes(raw[2:6], 'little') != len(raw) - 6:
            raise ValueError('Original dialogue RW size mismatch')
        xml = ET.fromstring(raw[6:])
        entries = xml.findall('.//DialogEntry')
        nodes = {node.attrib['ID']: node for node in entries}
        roots = [node.attrib['ID'] for node in entries if node.attrib.get('IsRoot') == 'true']
        if len(nodes) != len(entries) or len(roots) != 1:
            raise ValueError('Dialogue requires unique nodes and one root')
        reached, pending_nodes = set(), roots[:]
        while pending_nodes:
            key = pending_nodes.pop()
            if key in reached:
                continue
            reached.add(key)
            pending_nodes.extend(link.attrib['DestinationDialogID'] for link in nodes[key].findall('./OutgoingLinks/Link'))
        if reached != set(nodes):
            raise ValueError('Unreachable original dialogue nodes: ' + name)
        actor_map = {actor.attrib['ID']: {f.findtext('Title'): f.findtext('Value') for f in actor.findall('./Fields/Field')}
                     for actor in xml.findall('.//Actor')}
        used = {f.findtext('Value') for node in entries for f in node.findall('./Fields/Field')
                if f.findtext('Title') in ('Actor', 'Conversant')}
        actors = set()
        for key in used - {'999'}:
            actor = actor_map[key]
            actors.add((actor['CardType'], actor['CardID']))
        scripts = '\n'.join(node.text or '' for node in xml.findall('.//UserScript'))
        tokens = re.findall(r'\bres:\s*([^\s]+)', scripts)
        if any(not re.fullmatch(r'[A-Z0-9_.]+', token) for token in tokens):
            raise ValueError('Nonliteral or uninspected script resource: ' + name)
        combats = re.findall(r'\bcombat_goto\s+id:\s*(CB[A-Z0-9_]+)', scripts)
        report = {'name': name, 'nodes': len(nodes), 'reachable': len(reached),
                  'xml_sha256': hashlib.sha256(raw[6:]).hexdigest(), 'scripted_combat_ids': combats}
        parsed[name] = report, set(tokens), actors, combats
        return parsed[name]

    for chapter in season['childs'][10:]:
        pending = [story['entrypoint'] for story in chapter['childs']]
        combats, seen, reports, resources, actors = {}, set(), [], set(), set()

        def add_combat(code, declared=False):
            if code in combats:
                if declared:
                    combats[code]['directly_declared'] = True
                return
            combat, digest = hashed_json('resources/reference/episodes/EPISODE_COMBAT_' + code + '.json')
            actor_ids = [row['actor_id'] for side in ('left', 'right') for wave in combat[side]
                         for row in wave if row.get('actor_id')]
            bindings = []
            for actor_id in dict.fromkeys(actor_ids):
                matches = [(i, row) for i, row in enumerate(stat_rows) if row.get('id') == actor_id]
                if len(matches) != 1:
                    raise ValueError('Combat actor is missing or ambiguous: ' + actor_id)
                index, row = matches[0]
                bindings.append({'source_index': index, 'actor_id': actor_id,
                                 'ref_id': row.get('ref_id'), 'res_id': row['res_id']})
            combats[code] = {'id': code, 'sha256': digest, 'directly_declared': declared,
                             'game_res_id': str(combat['game_res_id']),
                             'environment_prefix': environments[str(combat['game_res_id'])],
                             'actor_bindings': bindings,
                             'win_dialog': combat['win_dialog'],
                             'lose_dialog': combat.get('lose_dialog'), 'lose_dialog2': combat.get('lose_dialog2')}
            for key in ('win_dialog', 'lose_dialog', 'lose_dialog2'):
                target = combat.get(key)
                if not target:
                    continue
                if target in ('EP_0000A', 'EP_0000B'):
                    common_losses.add(target)
                else:
                    pending.append(target)

        for story in chapter['childs']:
            if story.get('battle'):
                add_combat(story['linkedcombatonlyforref'], declared=True)
        while pending:
            name = pending.pop(0)
            if name in seen:
                continue
            seen.add(name)
            report, needed, used_actors, next_combats = decode_dialogue(name)
            reports.append(report)
            resources.update(needed)
            actors.update(used_actors)
            for code in next_combats:
                add_combat(code)
        all_resources.update(resources)
        all_actors.update(actors)
        chapters.append({'id': chapter['id'], 'stories': len(chapter['childs']),
                         'declared_combats': sum(bool(story.get('battle')) for story in chapter['childs']),
                         'combats': len(combats), 'combat_descriptors': list(combats.values()),
                         'dialogs': reports, 'literal_resources': sorted(resources), 'actors': sorted(actors)})
    losses = []
    for name in sorted(common_losses):
        report, needed, actors, combats = decode_dialogue(name)
        if combats:
            raise ValueError('Shared loss dialogue introduces an uninspected battle: ' + name + ' ' + str(combats))
        all_resources.update(needed)
        all_actors.update(actors)
        losses.append(report)
    owners, scanned = literal_owners(all_resources)
    missing = [name for name, packs in owners.items() if not packs]
    if missing:
        raise ValueError('Unresolved literal resources: ' + str(missing))
    additions = sorted({pack for packs in owners.values() for pack in packs if pack not in selected})
    return {'scope': 'E11..E18 original graph and literal resource/header owners; generated assets and native execution remain separate',
            'season_sha256': season_hash, 'actor_table_sha256': stat_hash,
            'environment_table_sha256': hashlib.sha256(env_path.read_bytes()).hexdigest(),
            'dialogue_pack_sha256': index['sha256'],
            'baseline_profile': profile['name'], 'baseline_groups': len(selected), 'scanned_original_packs': scanned,
            'chapters': chapters, 'dialogues': sum(len(c['dialogs']) for c in chapters),
            'reachable_nodes': sum(d['reachable'] for c in chapters for d in c['dialogs']),
            'combat_count': sum(c['combats'] for c in chapters), 'shared_loss_dialogues': losses,
            'actors': sorted(all_actors), 'literal_resource_owners': owners, 'literal_owner_additions': additions}


if __name__ == '__main__':
    print(json.dumps(audit(), indent=2))
