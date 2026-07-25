import ContactMessage from "../models/ContactMessage.js";
import SystemSettings from "../models/SystemSettings.js";
import { isEmailConfigured, sendEmail } from "../utils/sendEmail.js";

export const submitContactMessage = async (req, res) => {
  try {
    const { name, email, subject, category, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({
        message: "Name, email, and message are required",
      });
    }

    const allowedCategories = [
      "General",
      "Technical",
      "Demo",
      "Partnership",
      "Other",
    ];
    const safeCategory = allowedCategories.includes(category)
      ? category
      : "General";

    const record = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() || "",
      category: safeCategory,
      message: message.trim(),
    });

    let emailSent = false;
    const settings = await SystemSettings.findOne().select("supportEmail").lean();
    const supportTo =
      settings?.supportEmail ||
      process.env.SUPPORT_EMAIL ||
      "support@edutrack.lk";

    if (isEmailConfigured()) {
      try {
        const result = await sendEmail({
          to: supportTo,
          subject: `[EduTrack Contact] [${safeCategory}] ${
            subject?.trim() || "New inquiry"
          }`,
          text: [
            `Name: ${record.name}`,
            `Email: ${record.email}`,
            `Category: ${record.category}`,
            `Subject: ${record.subject || "(none)"}`,
            "",
            record.message,
          ].join("\n"),
          html: `
            <p><strong>Name:</strong> ${record.name}</p>
            <p><strong>Email:</strong> ${record.email}</p>
            <p><strong>Category:</strong> ${record.category}</p>
            <p><strong>Subject:</strong> ${record.subject || "(none)"}</p>
            <p>${record.message.replace(/\n/g, "<br />")}</p>
          `,
        });
        emailSent = result.sent;
        if (emailSent) {
          record.emailSent = true;
          await record.save();
        }
      } catch (mailError) {
        console.error("Contact notification email failed:", mailError.message);
      }
    }

    return res.status(201).json({
      message:
        "Message received. Our team will respond as soon as possible.",
      emailSent,
      id: record._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
