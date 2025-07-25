from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

def build_question_dim_map():
    qmap = {}
    for i in range(1, 21): qmap[i] = "战略决策"
    for i in range(21, 41): qmap[i] = "团队领导"
    for i in range(41, 61): qmap[i] = "执行管控"
    for i in range(61, 81): qmap[i] = "跨部门协作"
    big5 = ["开放性", "尽责性", "外向性", "宜人性", "情绪稳定"]
    for i in range(81, 101): qmap[i] = big5[(i-81)//4]
    holland = ["现实型", "研究型", "艺术型", "社会型", "企业型", "常规型"]
    for i in range(101, 161): qmap[i] = holland[(i-101)//10]
    ability = ["言语理解", "数量分析", "逻辑推理", "空间认知"]
    for i in range(161, 221): qmap[i] = ability[(i-161)//15]
    return qmap

qmap = build_question_dim_map()

def analyze_dimensions(answers, qmap):
    dim_scores = {}
    dim_counts = {}
    for item in answers:
        qid = int(item['id'])
        score = int(item['answer']) if item['answer'] else 0
        dim = qmap.get(qid, "未知")
        dim_scores[dim] = dim_scores.get(dim, 0) + score
        dim_counts[dim] = dim_counts.get(dim, 0) + 1
    dim_avg = {dim: round(dim_scores[dim]/dim_counts[dim], 2) for dim in dim_scores}
    return dim_avg

def analyze_holland(answers, qmap):
    holland_types = ["现实型", "研究型", "艺术型", "社会型", "企业型", "常规型"]
    type_scores = {t: 0 for t in holland_types}
    for item in answers:
        qid = int(item['id'])
        score = int(item['answer']) if item['answer'] else 0
        dim = qmap.get(qid, "")
        if dim in holland_types:
            type_scores[dim] += score
    sorted_types = sorted(type_scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_types

def analyze_big5(answers, qmap):
    big5 = ["开放性", "尽责性", "外向性", "宜人性", "情绪稳定"]
    big5_scores = {t: 0 for t in big5}
    for item in answers:
        qid = int(item['id'])
        score = int(item['answer']) if item['answer'] else 0
        dim = qmap.get(qid, "")
        if dim in big5:
            big5_scores[dim] += score
    return big5_scores

def analyze_ability(answers, qmap):
    ability = ["言语理解", "数量分析", "逻辑推理", "空间认知"]
    ab_scores = {t: 0 for t in ability}
    ab_counts = {t: 0 for t in ability}
    for item in answers:
        qid = int(item['id'])
        score = int(item['answer']) if item['answer'] else 0
        dim = qmap.get(qid, "")
        if dim in ability:
            ab_scores[dim] += score
            ab_counts[dim] += 1
    ab_avg = {dim: round(ab_scores[dim]/ab_counts[dim], 2) for dim in ab_scores}
    return ab_avg

def recommend_career(holland_sorted, ability_avg):
    main_type = holland_sorted[0][0]
    main_ability = max(ability_avg, key=ability_avg.get)
    return f"推荐方向：{main_type}，优势能力：{main_ability}"

@app.route('/api/submit', methods=['POST'])
def submit():
    data = request.json
    answers = data['answers']
    dim_avg = analyze_dimensions(answers, qmap)
    holland_sorted = analyze_holland(answers, qmap)
    big5_scores = analyze_big5(answers, qmap)
    ability_avg = analyze_ability(answers, qmap)
    career = recommend_career(holland_sorted, ability_avg)
    return jsonify({
        "msg": "提交成功",
        "count": len(answers),
        "维度平均分": dim_avg,
        "兴趣主型": holland_sorted,
        "大五人格": big5_scores,
        "能力分布": ability_avg,
        "岗位推荐": career
    })
