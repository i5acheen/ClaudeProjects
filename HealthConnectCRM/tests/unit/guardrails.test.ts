import { describe, expect, it } from "vitest";
import { checkInput, checkOutput, guessLanguage, isBlocking } from "@/lib/ai/guardrails";

describe("input checks", () => {
  it.each(["I have chest pain", "माझ्या वडिलांना छातीत दुखणे सुरू आहे", "मेरे पिताजी बेहोश हो गए", "papa behosh ho gaye"])("emergency: %s", (t) => expect(checkInput(t).emergency).toBe(true));
  it.each(["I want to talk to a person", "मला माणसाशी बोलायचं आहे", "किसी इंसान से बात करवाओ", "please call me"])("wants human: %s", (t) => expect(checkInput(t).wantsHuman).toBe(true));
  it.each(["which medicine should I take", "कोणते औषध घ्यावे?", "कौन सी दवा लूँ"])("medical: %s", (t) => expect(checkInput(t).medicalQuestion).toBe(true));
  it.each(["how much will it cost", "किती पैसे लागतील", "कितने पैसे लगेंगे"])("money: %s", (t) => expect(checkInput(t).moneyQuestion).toBe(true));
  it("word boundaries: 'feel' is not 'fee', 'payal' is not 'pay'", () => {
    const c = checkInput("I feel pain in legs, my name is Payal");
    expect(c.moneyQuestion).toBe(false);
  });
  it("ordinary messages trigger nothing", () => {
    expect(checkInput("माझ्या पायाच्या नसा फुगल्या आहेत, दोन वर्षांपासून")).toEqual({ emergency: false, wantsHuman: false, angry: false, medicalQuestion: false, moneyQuestion: false });
  });
});

describe("output checks", () => {
  it.each([
    ["Take paracetamol for the pain", "medicine"],
    ["घ्या 500 mg रोज", "dosage"],
    ["The operation costs ₹ 40,000", "price"],
    ["Your treatment is 100% guaranteed free", "guarantee"],
    ["उपचार नक्की मोफत होईल", "guarantee"],
    ["Your report shows a tumour", "diagnosis"],
  ])("flags %s as %s", (reply, flag) => {
    const flags = checkOutput(reply);
    expect(flags).toContain(flag);
    expect(isBlocking(flags)).toBe(true);
  });
  it("a normal Sahayak reply passes", () => {
    expect(checkOutput("धन्यवाद जी. आपले वय किती आहे?")).toEqual([]);
  });
  it("markdown is flagged but not blocking", () => {
    const flags = checkOutput("**नमस्कार** जी");
    expect(flags).toEqual(["markdown"]);
    expect(isBlocking(flags)).toBe(false);
  });
});

describe("guessLanguage", () => {
  it.each([
    ["मला पायाचा त्रास आहे", "mr"],
    ["मुझे पैर में दर्द है", "hi"],
    ["I have leg pain", "en"],
    ["mujhe pair me dard hai", "hi"],
    ["mala tras aahe", "mr"],
  ])("%s → %s", (t, l) => expect(guessLanguage(t)).toBe(l));
});
