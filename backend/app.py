from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
CORS(app)

model = SentenceTransformer("all-MiniLM-L6-v2")


@app.route("/embed", methods=["POST"])
def embed():
    data = request.get_json()

    synopsis = data.get("synopsis", "")
    opportunity = data.get("opportunity", "")
    technology = data.get("technology", "")
    applications = data.get("applications", "")

    combined_text = f"""
    {synopsis}
    {opportunity}
    {technology}
    {applications}
    """

    response = {
        "embedding":
            model.encode(combined_text).tolist(),

        "synopsis_embedding":
            model.encode(synopsis).tolist(),

        "opportunity_embedding":
            model.encode(opportunity).tolist(),

        "technology_embedding":
            model.encode(technology).tolist(),

        "applications_embedding":
            model.encode(applications).tolist(),
    }

    return jsonify(response)


@app.route("/embed-text", methods=["POST"])
def embed_text():
    """Embed a single free-text blob (used for the "what are you working on"
    onboarding field). Returns the same `embedding` shape as /embed so the
    web client can store it directly into the `working_on_embedding` column.
    """
    data = request.get_json() or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"error": "`text` must be a non-empty string"}), 400

    return jsonify({"embedding": model.encode(text).tolist()})


if __name__ == "__main__":
    app.run(debug=True, port=8002)