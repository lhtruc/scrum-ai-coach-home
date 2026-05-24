import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSkillProfile } from "../services/skillProfileApi";

const categories = {
  Development: [
    "Programming Fundamentals",
    "Python",
    "Web Development (Frontend)",
    "Backend Development",
  ],
  Systems: [
    "Database & SQL",
    "Version Control (Git)",
    "Testing & QA",
    "DevOps & Deployment",
  ],
  Advanced: [
    "AI & Machine Learning Basics",
    "System Design & Architecture",
  ],
};

function SkillProfile() {
  const navigate = useNavigate();

  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkillProfile();
  }, []);

  const fetchSkillProfile = async () => {
    try {
      const data = await getSkillProfile();

      console.log("Skill profile data:", data);

      setSkills(data.summary?.ratings || []);
    } catch (error) {
      console.error("Failed to fetch skill profile:", error);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  const renderSkillsByCategory = (categorySkills) => {
    return categorySkills.map((skillName) => {
      const skill = skills.find((item) => item.skill_name === skillName);

      if (!skill) return null;

      const progressWidth = `${(skill.rating_level / 5) * 100}%`;

      return (
        <div
          key={skill.skill_name}
          style={{
            border: "1px solid #e5e7eb",
            padding: "20px",
            marginBottom: "14px",
            borderRadius: "16px",
            backgroundColor: "#fff",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "20px" }}>
                {skill.skill_name}
              </h3>

              <p style={{ margin: "10px 0 0", color: "#475569" }}>
                Level: <strong>{skill.rating_level}/5</strong>
              </p>
            </div>

            <span
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                backgroundColor: "#eef2ff",
                color: "#4f46e5",
                fontWeight: "700",
                whiteSpace: "nowrap",
              }}
            >
              {skill.level}
            </span>
          </div>

          <div
            style={{
              width: "100%",
              height: "10px",
              backgroundColor: "#e5e7eb",
              borderRadius: "999px",
              overflow: "hidden",
              marginTop: "16px",
            }}
          >
            <div
              style={{
                width: progressWidth,
                height: "100%",
                backgroundColor: "#4f46e5",
              }}
            />
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div style={{ padding: "30px" }}>
        <h1>My Skill Profile</h1>
        <p>Loading skill profile...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "36px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: "8px" }}>My Skill Profile</h1>

      <p
        style={{
          color: "#64748b",
          marginTop: 0,
          marginBottom: "28px",
        }}
      >
        Review your assessed skills, current levels, and areas to improve.
      </p>

      {skills.length === 0 ? (
        <div
          style={{
            marginTop: "20px",
            padding: "24px",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            backgroundColor: "#fff",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h3>No skill profile yet</h3>

          <p>You have not completed any skill assessment yet.</p>

          <p>Please take the assessment first to view your skill profile.</p>

          <button
            onClick={() => navigate("/")}
            style={{
              padding: "12px 22px",
              border: "none",
              backgroundColor: "#4f46e5",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "700",
              boxShadow: "0 8px 20px rgba(79, 70, 229, 0.25)",
            }}
          >
            Take Assessment
          </button>
        </div>
      ) : (
        <>
          {Object.entries(categories).map(([category, categorySkills]) => {
            const filteredSkills = categorySkills.filter((skillName) =>
              skills.some((item) => item.skill_name === skillName)
            );

            if (filteredSkills.length === 0) return null;

            return (
              <section key={category} style={{ marginBottom: "34px" }}>
                <h2 style={{ marginBottom: "16px" }}>{category}</h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {renderSkillsByCategory(filteredSkills)}
                </div>
              </section>
            );
          })}

          <button
            onClick={() => navigate("/")}
            style={{
              padding: "12px 22px",
              border: "none",
              backgroundColor: "#4f46e5",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "700",
              boxShadow: "0 8px 20px rgba(79, 70, 229, 0.25)",
            }}
          >
            Retake Assessment
          </button>
        </>
      )}
    </div>
  );
}

export default SkillProfile;