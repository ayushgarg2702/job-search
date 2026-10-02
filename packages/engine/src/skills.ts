/**
 * Canonical skill -> patterns. Patterns are matched on word boundaries against
 * lowercased text, so keep them lowercase.
 */
const SKILLS: Record<string, string[]> = {
  JavaScript: ["javascript", "js", "es6"],
  TypeScript: ["typescript", "ts"],
  React: ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs"],
  "Node.js": ["node.js", "nodejs", "node"],
  Express: ["express", "express.js"],
  Angular: ["angular"],
  Vue: ["vue", "vue.js", "vuejs"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3", "tailwind", "sass", "scss"],
  Python: ["python"],
  Django: ["django"],
  Flask: ["flask"],
  FastAPI: ["fastapi"],
  Java: ["java"],
  Spring: ["spring", "spring boot", "springboot"],
  Kotlin: ["kotlin"],
  Go: ["golang", "go lang"],
  Rust: ["rust"],
  "C++": ["c++", "cpp"],
  "C#": ["c#", ".net", "dotnet", "asp.net"],
  PHP: ["php", "laravel"],
  Ruby: ["ruby", "rails", "ruby on rails"],
  Swift: ["swift", "ios"],
  Android: ["android"],
  Flutter: ["flutter", "dart"],
  "React Native": ["react native"],
  SQL: ["sql", "mysql", "postgres", "postgresql", "sql server", "oracle"],
  MongoDB: ["mongodb", "mongo"],
  Redis: ["redis"],
  Kafka: ["kafka"],
  RabbitMQ: ["rabbitmq"],
  Elasticsearch: ["elasticsearch", "opensearch"],
  GraphQL: ["graphql"],
  "REST APIs": ["rest", "restful", "rest api", "rest apis"],
  Microservices: ["microservices", "microservice"],
  "System design": ["system design", "distributed systems", "scalability", "high availability"],
  AWS: ["aws", "amazon web services", "ec2", "s3", "lambda"],
  GCP: ["gcp", "google cloud"],
  Azure: ["azure"],
  Docker: ["docker", "containers"],
  Kubernetes: ["kubernetes", "k8s", "eks", "gke"],
  Terraform: ["terraform"],
  "CI/CD": ["ci/cd", "jenkins", "github actions", "gitlab ci"],
  Linux: ["linux", "unix", "bash", "shell scripting"],
  Git: ["git"],
  "Data structures & algorithms": ["data structures", "algorithms", "dsa"],
  "Machine learning": ["machine learning", "ml", "scikit-learn", "sklearn", "xgboost"],
  "Deep learning": ["deep learning", "pytorch", "tensorflow", "keras"],
  "LLMs / GenAI": ["llm", "llms", "genai", "generative ai", "langchain", "rag", "prompt engineering"],
  "Data analysis": ["data analysis", "pandas", "numpy", "excel"],
  "Power BI / Tableau": ["power bi", "powerbi", "tableau", "looker"],
  Spark: ["spark", "pyspark", "databricks"],
  Airflow: ["airflow"],
  Testing: ["unit testing", "jest", "pytest", "junit", "selenium", "cypress", "playwright", "testing"],
  Figma: ["figma"],
  "Product management": ["product management", "roadmap", "prd", "product strategy"],
  Agile: ["agile", "scrum", "jira", "kanban"],
  Communication: ["communication", "stakeholder management", "stakeholders"],
  Leadership: ["team lead", "leadership", "mentoring", "people management"],
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const COMPILED: [string, RegExp][] = Object.entries(SKILLS).map(([skill, patterns]) => [
  skill,
  new RegExp(`(^|[^a-z0-9+#.])(${patterns.map(escapeRe).join("|")})(?=$|[^a-z0-9+#])`, "i"),
]);

export function extractSkills(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return COMPILED.filter(([, re]) => re.test(lower)).map(([skill]) => skill);
}

export function allKnownSkills(): string[] {
  return Object.keys(SKILLS);
}

/** Case-insensitive set membership that also understands aliases. */
export function hasSkill(profileSkills: string[], skill: string): boolean {
  const target = skill.toLowerCase();
  return profileSkills.some((s) => {
    const lower = s.toLowerCase();
    if (lower === target) return true;
    return extractSkills(s).some((canon) => canon.toLowerCase() === target);
  });
}
