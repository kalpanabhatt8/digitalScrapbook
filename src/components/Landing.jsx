import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();

  return (
    <section className="">
      <div className="flex items-center h-[90vh]">
        <section className="w-[fit-content] h-[fit-content] container">
          <div
            className="text-[1.5rem] text-left leading-none tracking-[0.12em] select-none text-black/80"
            style={{ fontFamily: '"Silkscreen", system-ui, sans-serif' }}
          >
            KEEPS
          </div>

          {/* Heading (Margarine) */}
          <h1
            className="mt-6 text-left text-[34px] sm:text-[38px] lg:text-[42px] leading-[1.15] text-black/90"
            style={{ fontFamily: '"Margarine", ui-sans-serif, system-ui' }}
          >
            Scrapbook your year. 12 diaries.
            <br className="hidden sm:block" />
            365 moods. Zero followers.
          </h1>

          {/* Paragraph (Quicksand) */}
          <p
            className="mt-4 text-left max-w-[30rem] text-[15.5px] sm:text-[16px] leading-relaxed text-black/60"
            style={{ fontFamily: '"Quicksand", ui-sans-serif, system-ui' }}
          >
            It’s like Notes app, but cute. And private. And way less cringe.
          </p>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => nav("/signup")}
              className="h-11 rounded-full px-6 text-[15px] font-medium text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 shadow hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              style={{ fontFamily: '"Quicksand", ui-sans-serif, system-ui' }}
            >
              Get started
            </button>
            <button
              onClick={() => nav("/login")}
              className="h-11 rounded-full px-5 text-[15px] font-medium bg-white/90 border border-black/10 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              style={{ fontFamily: '"Quicksand", ui-sans-serif, system-ui' }}
            >
              Log in
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
