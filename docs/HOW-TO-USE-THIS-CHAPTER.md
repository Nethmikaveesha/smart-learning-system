# Implementation chapter — how to use this file

Application source code was **not** changed. This folder only adds the report chapter and the test evidence that the chapter quotes.

## Sinhala (කෙටියෙන්)

1. `docs/Chapter-04-Implementation.md` ගොනුව Word එකේ **Chapter 4 – Implementation** විදිහට copy කරන්න.
2. `[Insert screenshot: …]` කියලා තියෙන තැන්වලට ඔයාගේ system screenshots දාන්න. Code එකෙන් screenshot generate කරලා නැහැ.
3. Tables, headings, සහ test results already filled. ඒවා report එකට ඕන answers.
4. System එකට damage එකක් කරලා නැහැ. Backend, frontend, MongoDB, ML models වෙනස් කරලා නැහැ.
5. Unit tests ආයේ run කරන්න ඕන නම් (system start කරන්න ඕන නැහැ):

```bash
node testing/unit-tests.mjs
```

## What you still add in Microsoft Word

| Item | Status in this repo | What you do |
| --- | --- | --- |
| Chapter 4 body text | Written from the live code | Copy into the ICBT/Word template |
| Unit-test results (11/11) | Captured in `testing/unit-test-results.log` | Keep the table; optionally paste the log as Appendix |
| JS / Python syntax results | Captured | Keep the table |
| Frontend ESLint | 11 existing style errors, 0 parse errors | Report as recorded; do not treat as a syntax failure |
| Dashboard screenshots | Not included | Capture Admin, Teacher, Student, Parent, Risk Alerts, Login |
| Cover page, TOC, page numbers | Not included | University template |
| Harvard / IEEE citations | Implementation chapter has few citations | Add only if your supervisor requires them here |

## What you do **not** need

- Do not retrain the ML models for this chapter.
- Do not change ports, `.env` secrets, or database data.
- Do not rewrite application files to “make lint 0” unless the supervisor asks for a code cleanup chapter.
