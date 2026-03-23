# Practical Tips

---

## Using Cursor Effectively

**Use Composer with a fast model.** Claude Sonnet is recommended — fast, cheap, and great for most tasks. Save the slower, more expensive models for when you're genuinely stuck on something complex.

**Don't burn credits on exploration.** Plan first, then build. Spend 20 minutes sketching out what you want before you open Composer. Vague prompts produce vague code. Specific prompts produce working code.

**Describe the person, not just the feature.** When prompting, tell Cursor who this is for and what their situation is. "Build a form" produces something generic. "Build a form for a home carer who needs to log medication times for three different people, on a phone, while doing something else" produces something useful.

---

## Scoping Your Project

**Keep scope ruthlessly small and ship something working.**

The temptation is to build everything. Resist it. One thing that works completely is worth more than five things that almost work.

Ask yourself: what is the one moment in this person's day that we're making better? Build that. Only that.

---

## Deploying

**Deploy to Vercel early — don't leave it to the end.**

The starter folder in this repo is a zero-config Vercel deploy. You can be live in under five minutes:

1. Fork or clone this repo
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Set the root directory to `starter/`
4. Deploy

From there, replace the starter files with your actual project as you build.

**Judges will open your URL.** If it's not live, your project doesn't exist as far as the judging goes.

---

## On the Day

- Talk to your person before you write a single line of code — even 15 minutes on the phone changes everything
- Timebox everything: 30 minutes planning, 3–4 hours building, 1 hour cleaning up and preparing to present
- If something isn't working after 30 minutes, cut it — don't let one feature sink the whole project
- Your pitch is: who is this person, what is their hard day, what does your tool do about it, and does it work — show it working

---

## Starter Project

The `starter/` folder in this repo is a minimal HTML/CSS site with zero dependencies, ready to deploy on Vercel.

It's a foundation, not a constraint. You can replace it entirely, build on top of it, or ignore it and use whatever stack you prefer.
