import { createContext, useContext, useState } from "react";

const FeedbackContext = createContext(null);

export const FeedbackProvider = ({ children }) => {
  const [formData, setFormData] = useState({
    candidateName: "",
    experience: "",
    skills: [{ name: "", rating: "" }],
    concepts: [{ topic: "", remark: "" }],
    finalRemarks: "",
    aiSummary: null,
    date: new Date().toLocaleDateString(),
    // new fields for form persistence
    feedbackType: "internal",
    selectedDepartment: "",
    selectedClient: "",
    clientId: "",
    // arrays to mirror skills/concepts for clarity
    selectedSkills: [],
    selectedConcepts: [],
  });

  const updateFormData = (data) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
      // always refresh date when updating
      date: new Date().toLocaleDateString(),
    }));
  };

  return (
    <FeedbackContext.Provider value={{ formData, updateFormData }}>
      {children}
    </FeedbackContext.Provider>
  );
};

export const useFeedbackContext = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedbackContext must be used within FeedbackProvider");
  }
  return context;
};
