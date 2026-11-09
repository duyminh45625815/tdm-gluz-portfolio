import { ImageResponse } from "next/og";

export const alt =
  "Truong Duy Minh | Personal Portfolio - IT Business Analyst";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(112deg, #09090d 0%, #101018 58%, #13101c 100%)",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -190,
            right: 24,
            width: 590,
            height: 590,
            borderRadius: "50%",
            background: "rgba(139, 92, 246, 0.13)",
            boxShadow: "0 0 120px 55px rgba(139, 92, 246, 0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -240,
            left: 250,
            width: 440,
            height: 440,
            borderRadius: "50%",
            background: "rgba(236, 43, 190, 0.08)",
            boxShadow: "0 0 110px 45px rgba(236, 43, 190, 0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 30,
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 22,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 68,
            left: 76,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#bdb5c8",
            fontSize: 16,
            letterSpacing: 3,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#ec2bbe",
              boxShadow: "0 0 16px rgba(236,43,190,0.9)",
            }}
          />
          TDM GLUZ
        </div>

        <div
          style={{
            position: "absolute",
            top: 144,
            left: 76,
            width: 565,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 67,
              lineHeight: 1.04,
              letterSpacing: -2,
              fontWeight: 800,
            }}
          >
            <span>Truong Duy</span>
            <span
              style={{
                background: "linear-gradient(90deg, #f8f5ff 0%, #e994ea 48%, #a78bfa 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Minh
            </span>
          </div>
          <div
            style={{
              marginTop: 13,
              color: "#c5bdce",
              fontSize: 24,
              letterSpacing: 0.3,
              fontWeight: 500,
            }}
          >
            Personal Portfolio
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 25,
            }}
          >
            <div
              style={{
                width: 4,
                height: 30,
                borderRadius: 4,
                background: "linear-gradient(180deg, #ec2bbe, #8b5cf6)",
              }}
            />
            <div
              style={{
                color: "#f0eaff",
                fontSize: 23,
                fontWeight: 700,
              }}
            >
              IT Business Analyst
            </div>
          </div>
          <div
            style={{
              width: 500,
              marginTop: 16,
              color: "#aaa5b3",
              fontSize: 17,
              lineHeight: 1.5,
            }}
          >
            Turning Business Needs Into Meaningful Digital Solutions.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 84,
            right: 66,
            width: 390,
            height: 438,
            display: "flex",
            flexDirection: "column",
            padding: 21,
            border: "1px solid rgba(196, 171, 255, 0.23)",
            borderRadius: 18,
            background: "rgba(18, 17, 26, 0.78)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 17,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              color: "#bdb4ca",
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: 600,
            }}
          >
            <span>BUSINESS / SYSTEMS</span>
            <span style={{ color: "#e68cdb" }}>01 — 04</span>
          </div>

          <div
            style={{
              position: "relative",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 17,
              padding: "20px 4px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 53,
                bottom: 52,
                left: 24,
                width: 2,
                background:
                  "linear-gradient(180deg, rgba(236,43,190,0.75), rgba(139,92,246,0.75))",
              }}
            />
            {[
              { label: "BUSINESS NEEDS", detail: "Understand the problem", color: "#ec2bbe" },
              { label: "REQUIREMENTS", detail: "Define what matters", color: "#c16cde" },
              { label: "PROCESS & DATA", detail: "Connect the workflow", color: "#a276f1" },
              { label: "DIGITAL SOLUTIONS", detail: "Shape a clear outcome", color: "#8b5cf6" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 15,
                  minHeight: 55,
                  padding: "8px 12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.035)",
                }}
              >
                <div
                  style={{
                    width: 17,
                    height: 17,
                    flexShrink: 0,
                    borderRadius: "50%",
                    border: `2px solid ${item.color}`,
                    background: "#17151e",
                    boxShadow: `0 0 13px ${item.color}66`,
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    style={{
                      color: "#eee9f5",
                      fontSize: 12,
                      letterSpacing: 1.5,
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </span>
                  <span style={{ color: "#8d8797", fontSize: 11 }}>
                    {item.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 15,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              color: "#8e8798",
              fontSize: 11,
              letterSpacing: 1.5,
            }}
          >
            <span>ANALYSIS → SOLUTIONS</span>
            <span style={{ color: "#c49bff" }}>●</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 55,
            left: 76,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 1,
              background: "linear-gradient(90deg, #ec2bbe, #8b5cf6)",
            }}
          />
          <span
            style={{
              color: "#b8b2c0",
              fontSize: 15,
              letterSpacing: 2,
            }}
          >
            tdm-gluz.online
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            right: 82,
            bottom: 58,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#ec2bbe",
            boxShadow: "0 0 20px 5px rgba(236,43,190,0.3)",
          }}
        />
      </div>
    ),
    size,
  );
}
