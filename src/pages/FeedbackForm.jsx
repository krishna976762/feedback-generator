import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import CandidateInfoForm from "../components/CandidateInfoForm";
import SkillsTable from "../components/SkillsTable";
import ConceptsTable from "../components/ConceptsTable";
import FinalRemarks from "../components/FinalRemarks";
import DownloadButton from "../components/DownloadButton";
import { useFeedbackForm } from "../hooks/useFeedbackForm";
import { validateForm } from "../utils/validation";
import { useFeedbackContext } from "../context/FeedbackContext";
import { generatePDF } from "../utils/pdfGenerator";
import { API_BASE_URL } from "../config/api";
// import { generateAISummary } from "../utils/openai";
import { generateAISummary } from "../utils/geminiai";

function FeedbackForm() {
  const {
    candidateName,
    setCandidateName,
    experience,
    setExperience,
    skills,
    setSkills,
    concepts,
    setConcepts,
    finalRemarks,
    setFinalRemarks,
    errors,
    setErrors,
    handleSkillChange,
    addSkill,
    removeSkill,
    handleConceptChange,
    addConcept,
    removeConcept,
  } = useFeedbackForm();

  const { formData, updateFormData } = useFeedbackContext();
  const navigate = useNavigate();

  // track when we're restoring to avoid clearing values
  const isInitializing = useRef(true);

  // Restore form data from context when component mounts (when returning from preview)
  useEffect(() => {
    const {
      candidateName: savedName,
      experience: savedExp,
      skills: savedSkills,
      concepts: savedConcepts,
      finalRemarks: savedRemarks,
      feedbackType: savedType,
      department: savedDept,
      selectedDepartment: savedDeptAlt,
      clientId: savedClient,
      selectedClient: savedClientAlt,
    } = formData;

    if (
      savedName ||
      savedExp ||
      (savedSkills && savedSkills.length > 0) ||
      (savedConcepts && savedConcepts.length > 0) ||
      savedRemarks ||
      savedType ||
      savedDept ||
      savedDeptAlt ||
      savedClient ||
      savedClientAlt
    ) {
      if (savedName) setCandidateName(savedName);
      if (savedExp) setExperience(savedExp);
      if (savedSkills && savedSkills.length > 0) setSkills(savedSkills);
      if (savedConcepts && savedConcepts.length > 0) setConcepts(savedConcepts);
      if (savedRemarks) setFinalRemarks(savedRemarks);
      if (savedType) setFeedbackType(savedType);
      const deptToUse = savedDept || savedDeptAlt;
      if (deptToUse) setSelectedDepartment(deptToUse);
      const clientToUse = savedClient || savedClientAlt;
      if (clientToUse) setSelectedClient(clientToUse);
    }

    // turn off initialization flag after state has been seeded
    // using microtask so dependent effects can check it
    Promise.resolve().then(() => {
      isInitializing.current = false;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummaryResult, setAISummaryResult] = useState(null);
  const [aiSummaryError, setAISummaryError] = useState("");
  const [dbData, setDbData] = useState({ skills: [], clientSkills: [] });

  const [feedbackType, setFeedbackType] = useState("internal");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedClient, setSelectedClient] = useState("");

  /* ---------- Load db.json ---------- */
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const res = await fetch("/db.json");
  //       const json = await res.json();
  //       setDbData(json || { skills: [], clientSkills: [] });
  //     } catch (e) {
  //       console.error(e);
  //     }
  //   })();
  // }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skillsRes, clientSkillsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/skills`),
          fetch(`${API_BASE_URL}/clientSkills`),
        ]);

        const skills = await skillsRes.json();
        const clientSkills = await clientSkillsRes.json();

        setDbData({
          skills: skills || [],
          clientSkills: clientSkills || [],
        });
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, []);
  /* ---------- Reset when toggle changes ---------- */
  useEffect(() => {
    // avoid clearing user selections during initial restore
    if (isInitializing.current) return;

    setSelectedDepartment("");
    setSelectedClient("");
    setSkills([{ name: "", rating: "" }]);
    setConcepts([{ topic: "", remark: "" }]);
  }, [feedbackType]);

  /* ---------- Reset department when client changes ---------- */
  useEffect(() => {
    if (isInitializing.current) return;
    setSelectedDepartment("");
  }, [selectedClient]);

  /* ---------- Client dropdown options ---------- */
  const clientOptions = (dbData.clientSkills || []).map((c) => ({
    id: c.clientId,
    name: c.clientName,
  }));

  /* ---------- Dynamic department options ---------- */
  const departmentOptions = (() => {
    if (feedbackType === "internal") {
      return [...new Set((dbData.skills || []).map((d) => d.department))];
    }

    if (feedbackType === "client") {
      if (!selectedClient) return [];

      return [
        ...new Set(
          (dbData.clientSkills || [])
            .filter((c) => c.clientId === selectedClient)
            .map((d) => d.department),
        ),
      ];
    }

    return [];
  })();

  /* ---------- Load skills + concepts ---------- */
  useEffect(() => {
    if (!selectedDepartment) return;

    // if we restored formData and it matches current selectors, use stored arrays
    if (
      formData.feedbackType === feedbackType &&
      (formData.department === selectedDepartment || formData.selectedDepartment === selectedDepartment) &&
      (formData.clientId === selectedClient || formData.selectedClient === selectedClient) &&
      formData.skills &&
      formData.skills.length
    ) {
      setSkills(formData.skills);
      setConcepts(formData.concepts || [{ topic: "", remark: "" }]);
      return;
    }

    const source =
      feedbackType === "internal" ? dbData.skills : dbData.clientSkills;

    let deptEntries = (source || []).filter(
      (d) => d.department === selectedDepartment,
    );

    if (feedbackType === "client" && selectedClient) {
      deptEntries = deptEntries.filter((d) => d.clientId === selectedClient);
    }

    const newSkills = [];
    const newConcepts = [];

    deptEntries.forEach((d) => {
      (d.skills || []).forEach((s) => {
        newSkills.push({ name: s.name || "", rating: "" });

        (s.concepts || []).forEach((c) => {
          newConcepts.push({ topic: c, remark: "" });
        });
      });
    });

    setSkills(newSkills.length ? newSkills : [{ name: "", rating: "" }]);
    setConcepts(newConcepts.length ? newConcepts : [{ topic: "", remark: "" }]);
  }, [selectedDepartment, selectedClient, feedbackType, dbData, formData]);

  /* ---------- Derive client name ---------- */
  const selectedClientObj = (dbData.clientSkills || []).find(
    (c) => c.clientId === selectedClient,
  );
  const clientName = selectedClientObj?.clientName || "";

  /* ---------- Preview ---------- */
  const handlePreview = () => {
    const validationErrors = validateForm(candidateName, experience, skills, concepts, finalRemarks);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      setTimeout(() => {
        const firstErrorKey = Object.keys(validationErrors)[0];
        const element = document.querySelector(`[data-error="${firstErrorKey}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    updateFormData({
      candidateName,
      experience,
      skills,
      concepts,
      finalRemarks,
      // mirror arrays for clarity
      selectedSkills: skills,
      selectedConcepts: concepts,

      feedbackType,
      department: selectedDepartment,
      selectedDepartment,
      clientId: selectedClient,
      selectedClient,
      clientName,
    });

    navigate("/preview");
  };

  /* ---------- PDF ---------- */
  const handleDownloadPDF = async () => {
    const validationErrors = validateForm(
      candidateName,
      experience,
      skills,
      concepts,
    );

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    updateFormData({
      candidateName,
      experience,
      skills,
      concepts,
      finalRemarks,
      selectedSkills: skills,
      selectedConcepts: concepts,
      feedbackType,
      department: selectedDepartment,
      selectedDepartment,
      clientId: selectedClient,
      selectedClient,
      clientName,
    });

    setIsGeneratingPDF(true);
    try {
      await generatePDF(candidateName);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateAISummary = async () => {
    setAISummaryError("");
    setAISummaryResult(null);

    const validationErrors = validateForm(
      candidateName,
      experience,
      skills,
      concepts,
      finalRemarks,
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorKey = Object.keys(validationErrors)[0];
      const element = document.querySelector(`[data-error="${firstErrorKey}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const requestPayload = {
      candidate_name: candidateName,
      experience,
      skills,
      concepts,
      overall_feedback: finalRemarks,
    };

    setIsGeneratingSummary(true);
    try {
      const aiResponse = await generateAISummary(requestPayload);
      setAISummaryResult(aiResponse);

      await fetch(`${API_BASE_URL}/feedbacks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidate_name: candidateName,
          experience,
          skills,
          concepts,
          overall_feedback: finalRemarks,
          ai_summary: aiResponse,
          created_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      setAISummaryError(error?.message || "Unable to generate AI summary.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <Header />

      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-2xl p-8 space-y-8 border border-gray-200">
        {/* Toggle + Dropdowns */}
        <div className="flex items-center gap-4 bg-gray-100 p-3 rounded-lg flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setFeedbackType("internal")}
              className={`px-4 py-1 rounded ${
                feedbackType === "internal"
                  ? "bg-red-600 text-white"
                  : "bg-white border"
              }`}
            >
              Internal
            </button>

            <button
              onClick={() => setFeedbackType("client")}
              className={`px-4 py-1 rounded ${
                feedbackType === "client"
                  ? "bg-red-600 text-white"
                  : "bg-white border"
              }`}
            >
              Client
            </button>
          </div>

          {/* Client dropdown */}
          {feedbackType === "client" && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">Select client</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Department dropdown */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Select department</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <CandidateInfoForm
          candidateName={candidateName}
          experience={experience}
          errors={errors}
          onNameChange={setCandidateName}
          onExperienceChange={setExperience}
        />

        <SkillsTable
          skills={skills}
          onSkillChange={handleSkillChange}
          onAddSkill={addSkill}
          onRemoveSkill={removeSkill}
          errors={errors}
        />

        <ConceptsTable
          concepts={concepts}
          onConceptChange={handleConceptChange}
          onAddConcept={addConcept}
          onRemoveConcept={removeConcept}
          errors={errors}
        />

        <FinalRemarks finalRemarks={finalRemarks} onRemarksChange={setFinalRemarks} errors={errors} />

        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">AI Summary</h3>
              <p className="text-sm text-gray-600">
                Generate a candidate summary, strengths, weaknesses, and recommendation from the form data.
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-3 text-white text-base font-semibold shadow-lg transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGenerateAISummary}
              disabled={isGeneratingSummary}
            >
              {isGeneratingSummary ? (
                <>
                  <svg
                    className="mr-2 h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating AI Summary...
                </>
              ) : (
                "Generate AI Summary"
              )}
            </button>
          </div>

          {aiSummaryError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
              {aiSummaryError}
            </div>
          )}

          {aiSummaryResult && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Summary</h4>
                <p className="mt-2 text-gray-700">{aiSummaryResult.summary}</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Strengths</h4>
                  <ul className="mt-3 list-disc list-inside text-gray-700">
                    {aiSummaryResult.strengths.map((item, index) => (
                      <li key={`strength-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Weaknesses</h4>
                  <ul className="mt-3 list-disc list-inside text-gray-700">
                    {aiSummaryResult.weaknesses.map((item, index) => (
                      <li key={`weakness-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-600">Recommendation</p>
                <p className="mt-2 text-xl font-bold text-gray-900">
                  {aiSummaryResult.recommendation}
                </p>
              </div>
            </div>
          )}
        </div>

        <DownloadButton
          onDownload={handleDownloadPDF}
          onPreview={handlePreview}
          isLoading={isGeneratingPDF}
        />
      </div>
    </div>
  );
}

export default FeedbackForm;
