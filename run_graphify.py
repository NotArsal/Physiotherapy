
import json
from pathlib import Path
from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_obsidian, to_canvas, to_html

root = Path('.')
detect_result = detect(root)
Path('.graphify_detect.json').write_text(json.dumps(detect_result, indent=2), encoding='utf-8')

code_files = []
for f in detect_result.get('files', {}).get('code', []):
    code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])

if code_files:
    ast_result = extract(code_files)
else:
    ast_result = {'nodes':[],'edges':[],'input_tokens':0,'output_tokens':0}

# Since we don't have LLM tokens in this raw script easily, we'll just skip the semantic extraction 
# and use the AST to generate the graph structure (since the user just wants the report).
G = build_from_json(ast_result)
if G.number_of_nodes() > 0:
    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)
    labels = {cid: f'Community {cid}' for cid in communities}
    questions = suggest_questions(G, communities, labels)
    
    Path('graphify-out').mkdir(exist_ok=True)
    report = generate(G, communities, cohesion, labels, gods, surprises, detect_result, {'input': 0, 'output': 0}, str(root), suggested_questions=questions)
    Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
    to_json(G, communities, 'graphify-out/graph.json')
    to_obsidian(G, communities, 'graphify-out/obsidian', community_labels=labels, cohesion=cohesion)
    to_canvas(G, communities, 'graphify-out/obsidian/graph.canvas', community_labels=labels)
    to_html(G, communities, 'graphify-out/graph.html', community_labels=labels)
    print('Graphify AST generation complete.')
else:
    print('Graph empty.')

