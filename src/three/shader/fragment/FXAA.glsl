varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform vec2 resolution;

// FXAA 3.11 implementation by NVIDIA, ported to WebGL by Agost Biro (biro@archilogic.com)
//--------------
// File:        es3-keplerFXAAassetsshaders/FXAA_DefaultES.frag
// SDK Version: v3.00
// Email:       gameworks@nvidia.com
// Site:        http://developer.nvidia.com/
//
// Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//  * Neither the name of NVIDIA CORPORATION nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ''AS IS'' AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
// EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//--------------

#define FXAA_GLSL_100 1
#define FXAA_QUALITY_PRESET 12
#define FXAA_GREEN_AS_LUMA 1

/* ===== */
#ifndef FXAA_PC_CONSOLE
	#define FXAA_PC_CONSOLE 0
#endif
/* ===== */
#ifndef FXAA_GLSL_120
	#define FXAA_GLSL_120 0
#endif
/* ===== */
#ifndef FXAA_GLSL_130
	#define FXAA_GLSL_130 0
#endif
/* ===== */
#ifndef FXAA_HLSL_3
	#define FXAA_HLSL_3 0
#endif
/* ===== */
#ifndef FXAA_HLSL_4
	#define FXAA_HLSL_4 0
#endif
/* ===== */
#ifndef FXAA_HLSL_5
	#define FXAA_HLSL_5 0
#endif
/* ========== */
#ifndef FXAA_GREEN_AS_LUMA
	#define FXAA_GREEN_AS_LUMA 0
#endif
/* ===== */
#ifndef FXAA_EARLY_EXIT
	#define FXAA_EARLY_EXIT 1
#endif
	/* ===== */
#ifndef FXAA_DISCARD
	#define FXAA_DISCARD 0
#endif
/* ===== */
#ifndef FXAA_FAST_PIXEL_OFFSET
	#ifdef GL_EXT_gpu_shader4
	#define FXAA_FAST_PIXEL_OFFSET 1
	#endif
	#ifdef GL_NV_gpu_shader5
	#define FXAA_FAST_PIXEL_OFFSET 1
	#endif
	#ifdef GL_ARB_gpu_shader5
	#define FXAA_FAST_PIXEL_OFFSET 1
	#endif
	#ifndef FXAA_FAST_PIXEL_OFFSET
	#define FXAA_FAST_PIXEL_OFFSET 0
	#endif
#endif
/* ===== */
#ifndef FXAA_GATHER4_ALPHA
	#if (FXAA_HLSL_5 == 1)
		#define FXAA_GATHER4_ALPHA 1
	#endif
	#ifdef GL_ARB_gpu_shader5
		#define FXAA_GATHER4_ALPHA 1
	#endif
	#ifdef GL_NV_gpu_shader5
		#define FXAA_GATHER4_ALPHA 1
	#endif
	#ifndef FXAA_GATHER4_ALPHA
		#define FXAA_GATHER4_ALPHA 0
	#endif
#endif

/*==========
FXAA QUALITY - TUNING KNOBS
----------
NOTE the other tuning knobs are now in the shader function inputs!
==========*/
#ifndef FXAA_QUALITY_PRESET
	#define FXAA_QUALITY_PRESET 12
#endif

/*========== FXAA QUALITY - PRESETS ==========*/

/*========== FXAA QUALITY - MEDIUM DITHER PRESETS ==========*/
#if (FXAA_QUALITY_PRESET == 10)
	#define FXAA_QUALITY_PS 3
	#define FXAA_QUALITY_P0 1.5
	#define FXAA_QUALITY_P1 3.0
	#define FXAA_QUALITY_P2 12.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 11)
	#define FXAA_QUALITY_PS 4
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 3.0
	#define FXAA_QUALITY_P3 12.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 12)
	#define FXAA_QUALITY_PS 5
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 4.0
	#define FXAA_QUALITY_P4 12.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 13)
	#define FXAA_QUALITY_PS 6
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 4.0
	#define FXAA_QUALITY_P5 12.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 14)
	#define FXAA_QUALITY_PS 7
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 2.0
	#define FXAA_QUALITY_P5 4.0
	#define FXAA_QUALITY_P6 12.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 15)
	#define FXAA_QUALITY_PS 8
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 2.0
	#define FXAA_QUALITY_P5 2.0
	#define FXAA_QUALITY_P6 4.0
	#define FXAA_QUALITY_P7 12.0
#endif

/*========== FXAA QUALITY - LOW DITHER PRESETS ==========*/

#if (FXAA_QUALITY_PRESET == 20)
	#define FXAA_QUALITY_PS 3
	#define FXAA_QUALITY_P0 1.5
	#define FXAA_QUALITY_P1 2.0
	#define FXAA_QUALITY_P2 8.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 21)
	#define FXAA_QUALITY_PS 4
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 8.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 22)
	#define FXAA_QUALITY_PS 5
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 8.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 23)
	#define FXAA_QUALITY_PS 6
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 2.0
	#define FXAA_QUALITY_P5 8.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 24)
	#define FXAA_QUALITY_PS 7
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 2.0
	#define FXAA_QUALITY_P5 3.0
	#define FXAA_QUALITY_P6 8.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 25)
	#define FXAA_QUALITY_PS 8
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 2.0
	#define FXAA_QUALITY_P5 2.0
	#define FXAA_QUALITY_P6 4.0
	#define FXAA_QUALITY_P7 8.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 26)
	#define FXAA_QUALITY_PS 9
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 2.0
	#define FXAA_QUALITY_P5 2.0
	#define FXAA_QUALITY_P6 2.0
	#define FXAA_QUALITY_P7 4.0
	#define FXAA_QUALITY_P8 8.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 27)
	#define FXAA_QUALITY_PS 10
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 2.0
	#define FXAA_QUALITY_P5 2.0
	#define FXAA_QUALITY_P6 2.0
	#define FXAA_QUALITY_P7 2.0
	#define FXAA_QUALITY_P8 4.0
	#define FXAA_QUALITY_P9 8.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 28)
	#define FXAA_QUALITY_PS 11
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 2.0
	#define FXAA_QUALITY_P5 2.0
	#define FXAA_QUALITY_P6 2.0
	#define FXAA_QUALITY_P7 2.0
	#define FXAA_QUALITY_P8 2.0
	#define FXAA_QUALITY_P9 4.0
	#define FXAA_QUALITY_P10 8.0
#endif
/* ===== */
#if (FXAA_QUALITY_PRESET == 29)
	#define FXAA_QUALITY_PS 12
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.5
	#define FXAA_QUALITY_P2 2.0
	#define FXAA_QUALITY_P3 2.0
	#define FXAA_QUALITY_P4 2.0
	#define FXAA_QUALITY_P5 2.0
	#define FXAA_QUALITY_P6 2.0
	#define FXAA_QUALITY_P7 2.0
	#define FXAA_QUALITY_P8 2.0
	#define FXAA_QUALITY_P9 2.0
	#define FXAA_QUALITY_P10 4.0
	#define FXAA_QUALITY_P11 8.0
#endif

/*========== FXAA QUALITY - EXTREME QUALITY ==========*/

#if (FXAA_QUALITY_PRESET == 39)
	#define FXAA_QUALITY_PS 12
	#define FXAA_QUALITY_P0 1.0
	#define FXAA_QUALITY_P1 1.0
	#define FXAA_QUALITY_P2 1.0
	#define FXAA_QUALITY_P3 1.0
	#define FXAA_QUALITY_P4 1.0
	#define FXAA_QUALITY_P5 1.5
	#define FXAA_QUALITY_P6 2.0
	#define FXAA_QUALITY_P7 2.0
	#define FXAA_QUALITY_P8 2.0
	#define FXAA_QUALITY_P9 2.0
	#define FXAA_QUALITY_P10 4.0
	#define FXAA_QUALITY_P11 8.0
#endif

/*========== API PORTING ==========*/

#if (FXAA_GLSL_100 == 1) || (FXAA_GLSL_120 == 1) || (FXAA_GLSL_130 == 1)
	#define FxaaBool bool
	#define FxaaDiscard discard
	#define FxaaFloat float
	#define FxaaFloat2 vec2
	#define FxaaFloat3 vec3
	#define FxaaFloat4 vec4
	#define FxaaHalf float
	#define FxaaHalf2 vec2
	#define FxaaHalf3 vec3
	#define FxaaHalf4 vec4
	#define FxaaInt2 ivec2
	#define FxaaSat(x) clamp(x, 0.0, 1.0)
	#define FxaaTex sampler2D
#else
	#define FxaaBool bool
	#define FxaaDiscard clip(-1)
	#define FxaaFloat float
	#define FxaaFloat2 float2
	#define FxaaFloat3 float3
	#define FxaaFloat4 float4
	#define FxaaHalf half
	#define FxaaHalf2 half2
	#define FxaaHalf3 half3
	#define FxaaHalf4 half4
	#define FxaaSat(x) saturate(x)
#endif
/* ===== */
#if (FXAA_GLSL_100 == 1)
	#define FxaaTexTop(t, p) texture2D(t, p, 0.0)
	#define FxaaTexOff(t, p, o, r) texture2D(t, p + (o * r), 0.0)
#endif
/* ===== */
#if (FXAA_GLSL_120 == 1)
	#define FxaaTexTop(t, p) texture2DLod(t, p, 0.0)
	#if (FXAA_FAST_PIXEL_OFFSET == 1)
		#define FxaaTexOff(t, p, o, r) texture2DLodOffset(t, p, 0.0, o)
	#else
		#define FxaaTexOff(t, p, o, r) texture2DLod(t, p + (o * r), 0.0)
	#endif
	#if (FXAA_GATHER4_ALPHA == 1)
		#define FxaaTexAlpha4(t, p) textureGather(t, p, 3)
		#define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)
		#define FxaaTexGreen4(t, p) textureGather(t, p, 1)
		#define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)
	#endif
#endif
/* ===== */
#if (FXAA_GLSL_130 == 1)
	#define FxaaTexTop(t, p) textureLod(t, p, 0.0)
	#define FxaaTexOff(t, p, o, r) textureLodOffset(t, p, 0.0, o)
	#if (FXAA_GATHER4_ALPHA == 1)
		#define FxaaTexAlpha4(t, p) textureGather(t, p, 3)
		#define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)
		#define FxaaTexGreen4(t, p) textureGather(t, p, 1)
		#define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)
	#endif
#endif

/* ===== */
#if (FXAA_HLSL_3 == 1)
	#define FxaaInt2 float2
	#define FxaaTex sampler2D
	#define FxaaTexTop(t, p) tex2Dlod(t, float4(p, 0.0, 0.0))
	#define FxaaTexOff(t, p, o, r) tex2Dlod(t, float4(p + (o * r), 0, 0))
#endif
/* ===== */
#if (FXAA_HLSL_4 == 1)
	#define FxaaInt2 int2

struct FxaaTex {
    SamplerState smpl;
    Texture2D tex;
};

	#define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)
	#define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)
#endif
/* ===== */
#if (FXAA_HLSL_5 == 1)
	#define FxaaInt2 int2

struct FxaaTex {
    SamplerState smpl;
    Texture2D tex;
};

	#define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)
	#define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)
	#define FxaaTexAlpha4(t, p) t.tex.GatherAlpha(t.smpl, p)
	#define FxaaTexOffAlpha4(t, p, o) t.tex.GatherAlpha(t.smpl, p, o)
	#define FxaaTexGreen4(t, p) t.tex.GatherGreen(t.smpl, p)
	#define FxaaTexOffGreen4(t, p, o) t.tex.GatherGreen(t.smpl, p, o)
#endif

/*========== GREEN AS LUMA OPTION SUPPORT FUNCTION ==========*/

#if (FXAA_GREEN_AS_LUMA == 0)
FxaaFloat FxaaLuma(FxaaFloat4 rgba) {
    return rgba.w;
}
	#else
FxaaFloat FxaaLuma(FxaaFloat4 rgba) {
    return rgba.y;
}
#endif

/*========== FXAA3 - PC ==========*/

FxaaFloat4 FxaaPixelShader(FxaaFloat2 pos, FxaaFloat4 fxaaConsolePosPos, FxaaTex tex, FxaaTex fxaaConsole360TexExpBiasNegOne, FxaaTex fxaaConsole360TexExpBiasNegTwo, FxaaFloat2 fxaaQualityRcpFrame, FxaaFloat4 fxaaConsoleRcpFrameOpt, FxaaFloat4 fxaaConsoleRcpFrameOpt2, FxaaFloat4 fxaaConsole360RcpFrameOpt2, FxaaFloat fxaaQualitySubpix, FxaaFloat fxaaQualityEdgeThreshold, FxaaFloat fxaaQualityEdgeThresholdMin, FxaaFloat fxaaConsoleEdgeSharpness, FxaaFloat fxaaConsoleEdgeThreshold, FxaaFloat fxaaConsoleEdgeThresholdMin, FxaaFloat4 fxaaConsole360ConstDir) {
	/* ===== */
    FxaaFloat2 posM;
    posM.x = pos.x;
    posM.y = pos.y;
	#if (FXAA_GATHER4_ALPHA == 1)
		#if (FXAA_DISCARD == 0)
    FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);
			#if (FXAA_GREEN_AS_LUMA == 0)
				#define lumaM rgbyM.w
			#else
				#define lumaM rgbyM.y
			#endif
		#endif
		#if (FXAA_GREEN_AS_LUMA == 0)
    FxaaFloat4 luma4A = FxaaTexAlpha4(tex, posM);
    FxaaFloat4 luma4B = FxaaTexOffAlpha4(tex, posM, FxaaInt2(-1, -1));
		#else
    FxaaFloat4 luma4A = FxaaTexGreen4(tex, posM);
    FxaaFloat4 luma4B = FxaaTexOffGreen4(tex, posM, FxaaInt2(-1, -1));
		#endif
		#if (FXAA_DISCARD == 1)
			#define lumaM luma4A.w
		#endif
		#define lumaE luma4A.z
		#define lumaS luma4A.x
		#define lumaSE luma4A.y
		#define lumaNW luma4B.w
		#define lumaN luma4B.z
		#define lumaW luma4B.x
	#else
    FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);
		#if (FXAA_GREEN_AS_LUMA == 0)
			#define lumaM rgbyM.w
		#else
			#define lumaM rgbyM.y
		#endif
		#if (FXAA_GLSL_100 == 1)
    FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(0.0, 1.0), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(1.0, 0.0), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(0.0, -1.0), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 0.0), fxaaQualityRcpFrame.xy));
		#else
    FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(0, 1), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(1, 0), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(0, -1), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 0), fxaaQualityRcpFrame.xy));
		#endif
	#endif
	/* ===== */
    FxaaFloat maxSM = max(lumaS, lumaM);
    FxaaFloat minSM = min(lumaS, lumaM);
    FxaaFloat maxESM = max(lumaE, maxSM);
    FxaaFloat minESM = min(lumaE, minSM);
    FxaaFloat maxWN = max(lumaN, lumaW);
    FxaaFloat minWN = min(lumaN, lumaW);
    FxaaFloat rangeMax = max(maxWN, maxESM);
    FxaaFloat rangeMin = min(minWN, minESM);
    FxaaFloat rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;
    FxaaFloat range = rangeMax - rangeMin;
    FxaaFloat rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);
    FxaaBool earlyExit = range < rangeMaxClamped;
	/* ===== */
    if(earlyExit)
		#if (FXAA_DISCARD == 1)
        FxaaDiscard;
		#else
    return rgbyM;
		#endif
	/* ===== */
	#if (FXAA_GATHER4_ALPHA == 0)
		#if (FXAA_GLSL_100 == 1)
    FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, -1.0), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(1.0, 1.0), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(1.0, -1.0), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 1.0), fxaaQualityRcpFrame.xy));
		#else
    FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, -1), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(1, 1), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(1, -1), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));
		#endif
	#else
    FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(1, -1), fxaaQualityRcpFrame.xy));
    FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));
	#endif
	/* ===== */
    FxaaFloat lumaNS = lumaN + lumaS;
    FxaaFloat lumaWE = lumaW + lumaE;
    FxaaFloat subpixRcpRange = 1.0 / range;
    FxaaFloat subpixNSWE = lumaNS + lumaWE;
    FxaaFloat edgeHorz1 = (-2.0 * lumaM) + lumaNS;
    FxaaFloat edgeVert1 = (-2.0 * lumaM) + lumaWE;
	/* ===== */
    FxaaFloat lumaNESE = lumaNE + lumaSE;
    FxaaFloat lumaNWNE = lumaNW + lumaNE;
    FxaaFloat edgeHorz2 = (-2.0 * lumaE) + lumaNESE;
    FxaaFloat edgeVert2 = (-2.0 * lumaN) + lumaNWNE;
	/* ===== */
    FxaaFloat lumaNWSW = lumaNW + lumaSW;
    FxaaFloat lumaSWSE = lumaSW + lumaSE;
    FxaaFloat edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);
    FxaaFloat edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);
    FxaaFloat edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;
    FxaaFloat edgeVert3 = (-2.0 * lumaS) + lumaSWSE;
    FxaaFloat edgeHorz = abs(edgeHorz3) + edgeHorz4;
    FxaaFloat edgeVert = abs(edgeVert3) + edgeVert4;
	/* ===== */
    FxaaFloat subpixNWSWNESE = lumaNWSW + lumaNESE;
    FxaaFloat lengthSign = fxaaQualityRcpFrame.x;
    FxaaBool horzSpan = edgeHorz >= edgeVert;
    FxaaFloat subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;
	/* ===== */
    if(!horzSpan)
        lumaN = lumaW;
    if(!horzSpan)
        lumaS = lumaE;
    if(horzSpan)
        lengthSign = fxaaQualityRcpFrame.y;
    FxaaFloat subpixB = (subpixA * (1.0 / 12.0)) - lumaM;
	/* ===== */
    FxaaFloat gradientN = lumaN - lumaM;
    FxaaFloat gradientS = lumaS - lumaM;
    FxaaFloat lumaNN = lumaN + lumaM;
    FxaaFloat lumaSS = lumaS + lumaM;
    FxaaBool pairN = abs(gradientN) >= abs(gradientS);
    FxaaFloat gradient = max(abs(gradientN), abs(gradientS));
    if(pairN)
        lengthSign = -lengthSign;
    FxaaFloat subpixC = FxaaSat(abs(subpixB) * subpixRcpRange);
	/* ===== */
    FxaaFloat2 posB;
    posB.x = posM.x;
    posB.y = posM.y;
    FxaaFloat2 offNP;
    offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;
    offNP.y = (horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;
    if(!horzSpan)
        posB.x += lengthSign * 0.5;
    if(horzSpan)
        posB.y += lengthSign * 0.5;
	/* ===== */
    FxaaFloat2 posN;
    posN.x = posB.x - offNP.x * FXAA_QUALITY_P0;
    posN.y = posB.y - offNP.y * FXAA_QUALITY_P0;
    FxaaFloat2 posP;
    posP.x = posB.x + offNP.x * FXAA_QUALITY_P0;
    posP.y = posB.y + offNP.y * FXAA_QUALITY_P0;
    FxaaFloat subpixD = ((-2.0) * subpixC) + 3.0;
    FxaaFloat lumaEndN = FxaaLuma(FxaaTexTop(tex, posN));
    FxaaFloat subpixE = subpixC * subpixC;
    FxaaFloat lumaEndP = FxaaLuma(FxaaTexTop(tex, posP));
	/* ===== */
    if(!pairN)
        lumaNN = lumaSS;
    FxaaFloat gradientScaled = gradient * 1.0 / 4.0;
    FxaaFloat lumaMM = lumaM - lumaNN * 0.5;
    FxaaFloat subpixF = subpixD * subpixE;
    FxaaBool lumaMLTZero = lumaMM < 0.0;
	/* ===== */
    lumaEndN -= lumaNN * 0.5;
    lumaEndP -= lumaNN * 0.5;
    FxaaBool doneN = abs(lumaEndN) >= gradientScaled;
    FxaaBool doneP = abs(lumaEndP) >= gradientScaled;
    if(!doneN)
        posN.x -= offNP.x * FXAA_QUALITY_P1;
    if(!doneN)
        posN.y -= offNP.y * FXAA_QUALITY_P1;
    FxaaBool doneNP = (!doneN) || (!doneP);
    if(!doneP)
        posP.x += offNP.x * FXAA_QUALITY_P1;
    if(!doneP)
        posP.y += offNP.y * FXAA_QUALITY_P1;
	/* ===== */
    if(doneNP) {
        if(!doneN)
            lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
        if(!doneP)
            lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
        if(!doneN)
            lumaEndN = lumaEndN - lumaNN * 0.5;
        if(!doneP)
            lumaEndP = lumaEndP - lumaNN * 0.5;
        doneN = abs(lumaEndN) >= gradientScaled;
        doneP = abs(lumaEndP) >= gradientScaled;
        if(!doneN)
            posN.x -= offNP.x * FXAA_QUALITY_P2;
        if(!doneN)
            posN.y -= offNP.y * FXAA_QUALITY_P2;
        doneNP = (!doneN) || (!doneP);
        if(!doneP)
            posP.x += offNP.x * FXAA_QUALITY_P2;
        if(!doneP)
            posP.y += offNP.y * FXAA_QUALITY_P2;
		/* ===== */
		#if (FXAA_QUALITY_PS > 3)
        if(doneNP) {
            if(!doneN)
                lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
            if(!doneP)
                lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
            if(!doneN)
                lumaEndN = lumaEndN - lumaNN * 0.5;
            if(!doneP)
                lumaEndP = lumaEndP - lumaNN * 0.5;
            doneN = abs(lumaEndN) >= gradientScaled;
            doneP = abs(lumaEndP) >= gradientScaled;
            if(!doneN)
                posN.x -= offNP.x * FXAA_QUALITY_P3;
            if(!doneN)
                posN.y -= offNP.y * FXAA_QUALITY_P3;
            doneNP = (!doneN) || (!doneP);
            if(!doneP)
                posP.x += offNP.x * FXAA_QUALITY_P3;
            if(!doneP)
                posP.y += offNP.y * FXAA_QUALITY_P3;
			/* ===== */
			#if (FXAA_QUALITY_PS > 4)
            if(doneNP) {
                if(!doneN)
                    lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                if(!doneP)
                    lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                if(!doneN)
                    lumaEndN = lumaEndN - lumaNN * 0.5;
                if(!doneP)
                    lumaEndP = lumaEndP - lumaNN * 0.5;
                doneN = abs(lumaEndN) >= gradientScaled;
                doneP = abs(lumaEndP) >= gradientScaled;
                if(!doneN)
                    posN.x -= offNP.x * FXAA_QUALITY_P4;
                if(!doneN)
                    posN.y -= offNP.y * FXAA_QUALITY_P4;
                doneNP = (!doneN) || (!doneP);
                if(!doneP)
                    posP.x += offNP.x * FXAA_QUALITY_P4;
                if(!doneP)
                    posP.y += offNP.y * FXAA_QUALITY_P4;
				/* ===== */
				#if (FXAA_QUALITY_PS > 5)
                if(doneNP) {
                    if(!doneN)
                        lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                    if(!doneP)
                        lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                    if(!doneN)
                        lumaEndN = lumaEndN - lumaNN * 0.5;
                    if(!doneP)
                        lumaEndP = lumaEndP - lumaNN * 0.5;
                    doneN = abs(lumaEndN) >= gradientScaled;
                    doneP = abs(lumaEndP) >= gradientScaled;
                    if(!doneN)
                        posN.x -= offNP.x * FXAA_QUALITY_P5;
                    if(!doneN)
                        posN.y -= offNP.y * FXAA_QUALITY_P5;
                    doneNP = (!doneN) || (!doneP);
                    if(!doneP)
                        posP.x += offNP.x * FXAA_QUALITY_P5;
                    if(!doneP)
                        posP.y += offNP.y * FXAA_QUALITY_P5;
					/* ===== */
					#if (FXAA_QUALITY_PS > 6)
                    if(doneNP) {
                        if(!doneN)
                            lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                        if(!doneP)
                            lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                        if(!doneN)
                            lumaEndN = lumaEndN - lumaNN * 0.5;
                        if(!doneP)
                            lumaEndP = lumaEndP - lumaNN * 0.5;
                        doneN = abs(lumaEndN) >= gradientScaled;
                        doneP = abs(lumaEndP) >= gradientScaled;
                        if(!doneN)
                            posN.x -= offNP.x * FXAA_QUALITY_P6;
                        if(!doneN)
                            posN.y -= offNP.y * FXAA_QUALITY_P6;
                        doneNP = (!doneN) || (!doneP);
                        if(!doneP)
                            posP.x += offNP.x * FXAA_QUALITY_P6;
                        if(!doneP)
                            posP.y += offNP.y * FXAA_QUALITY_P6;
						/* ===== */
						#if (FXAA_QUALITY_PS > 7)
                        if(doneNP) {
                            if(!doneN)
                                lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                            if(!doneP)
                                lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                            if(!doneN)
                                lumaEndN = lumaEndN - lumaNN * 0.5;
                            if(!doneP)
                                lumaEndP = lumaEndP - lumaNN * 0.5;
                            doneN = abs(lumaEndN) >= gradientScaled;
                            doneP = abs(lumaEndP) >= gradientScaled;
                            if(!doneN)
                                posN.x -= offNP.x * FXAA_QUALITY_P7;
                            if(!doneN)
                                posN.y -= offNP.y * FXAA_QUALITY_P7;
                            doneNP = (!doneN) || (!doneP);
                            if(!doneP)
                                posP.x += offNP.x * FXAA_QUALITY_P7;
                            if(!doneP)
                                posP.y += offNP.y * FXAA_QUALITY_P7;
							/* ===== */
							#if (FXAA_QUALITY_PS > 8)
                            if(doneNP) {
                                if(!doneN)
                                    lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                if(!doneP)
                                    lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                if(!doneN)
                                    lumaEndN = lumaEndN - lumaNN * 0.5;
                                if(!doneP)
                                    lumaEndP = lumaEndP - lumaNN * 0.5;
                                doneN = abs(lumaEndN) >= gradientScaled;
                                doneP = abs(lumaEndP) >= gradientScaled;
                                if(!doneN)
                                    posN.x -= offNP.x * FXAA_QUALITY_P8;
                                if(!doneN)
                                    posN.y -= offNP.y * FXAA_QUALITY_P8;
                                doneNP = (!doneN) || (!doneP);
                                if(!doneP)
                                    posP.x += offNP.x * FXAA_QUALITY_P8;
                                if(!doneP)
                                    posP.y += offNP.y * FXAA_QUALITY_P8;
								/* ===== */
								#if (FXAA_QUALITY_PS > 9)
                                if(doneNP) {
                                    if(!doneN)
                                        lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                    if(!doneP)
                                        lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                    if(!doneN)
                                        lumaEndN = lumaEndN - lumaNN * 0.5;
                                    if(!doneP)
                                        lumaEndP = lumaEndP - lumaNN * 0.5;
                                    doneN = abs(lumaEndN) >= gradientScaled;
                                    doneP = abs(lumaEndP) >= gradientScaled;
                                    if(!doneN)
                                        posN.x -= offNP.x * FXAA_QUALITY_P9;
                                    if(!doneN)
                                        posN.y -= offNP.y * FXAA_QUALITY_P9;
                                    doneNP = (!doneN) || (!doneP);
                                    if(!doneP)
                                        posP.x += offNP.x * FXAA_QUALITY_P9;
                                    if(!doneP)
                                        posP.y += offNP.y * FXAA_QUALITY_P9;
									/* ===== */
									#if (FXAA_QUALITY_PS > 10)
                                    if(doneNP) {
                                        if(!doneN)
                                            lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                        if(!doneP)
                                            lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                        if(!doneN)
                                            lumaEndN = lumaEndN - lumaNN * 0.5;
                                        if(!doneP)
                                            lumaEndP = lumaEndP - lumaNN * 0.5;
                                        doneN = abs(lumaEndN) >= gradientScaled;
                                        doneP = abs(lumaEndP) >= gradientScaled;
                                        if(!doneN)
                                            posN.x -= offNP.x * FXAA_QUALITY_P10;
                                        if(!doneN)
                                            posN.y -= offNP.y * FXAA_QUALITY_P10;
                                        doneNP = (!doneN) || (!doneP);
                                        if(!doneP)
                                            posP.x += offNP.x * FXAA_QUALITY_P10;
                                        if(!doneP)
                                            posP.y += offNP.y * FXAA_QUALITY_P10;
										/* ===== */
										#if (FXAA_QUALITY_PS > 11)
                                        if(doneNP) {
                                            if(!doneN)
                                                lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                            if(!doneP)
                                                lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                            if(!doneN)
                                                lumaEndN = lumaEndN - lumaNN * 0.5;
                                            if(!doneP)
                                                lumaEndP = lumaEndP - lumaNN * 0.5;
                                            doneN = abs(lumaEndN) >= gradientScaled;
                                            doneP = abs(lumaEndP) >= gradientScaled;
                                            if(!doneN)
                                                posN.x -= offNP.x * FXAA_QUALITY_P11;
                                            if(!doneN)
                                                posN.y -= offNP.y * FXAA_QUALITY_P11;
                                            doneNP = (!doneN) || (!doneP);
                                            if(!doneP)
                                                posP.x += offNP.x * FXAA_QUALITY_P11;
                                            if(!doneP)
                                                posP.y += offNP.y * FXAA_QUALITY_P11;
											/* ===== */
											#if (FXAA_QUALITY_PS > 12)
                                            if(doneNP) {
                                                if(!doneN)
                                                    lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));
                                                if(!doneP)
                                                    lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));
                                                if(!doneN)
                                                    lumaEndN = lumaEndN - lumaNN * 0.5;
                                                if(!doneP)
                                                    lumaEndP = lumaEndP - lumaNN * 0.5;
                                                doneN = abs(lumaEndN) >= gradientScaled;
                                                doneP = abs(lumaEndP) >= gradientScaled;
                                                if(!doneN)
                                                    posN.x -= offNP.x * FXAA_QUALITY_P12;
                                                if(!doneN)
                                                    posN.y -= offNP.y * FXAA_QUALITY_P12;
                                                doneNP = (!doneN) || (!doneP);
                                                if(!doneP)
                                                    posP.x += offNP.x * FXAA_QUALITY_P12;
                                                if(!doneP)
                                                    posP.y += offNP.y * FXAA_QUALITY_P12;
												/* ===== */
                                            }
											#endif
											/* ===== */
                                        }
										#endif
										/* ===== */
                                    }
									#endif
									/* ===== */
                                }
								#endif
								/* ===== */
                            }
							#endif
							/* ===== */
                        }
						#endif
						/* ===== */
                    }
					#endif
					/* ===== */
                }
				#endif
				/* ===== */
            }
			#endif
			/* ===== */
        }
		#endif
		/* ===== */
    }
	/* ===== */
    FxaaFloat dstN = posM.x - posN.x;
    FxaaFloat dstP = posP.x - posM.x;
    if(!horzSpan)
        dstN = posM.y - posN.y;
    if(!horzSpan)
        dstP = posP.y - posM.y;
	/* ===== */
    FxaaBool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
    FxaaFloat spanLength = (dstP + dstN);
    FxaaBool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
    FxaaFloat spanLengthRcp = 1.0 / spanLength;
	/* ===== */
    FxaaBool directionN = dstN < dstP;
    FxaaFloat dst = min(dstN, dstP);
    FxaaBool goodSpan = directionN ? goodSpanN : goodSpanP;
    FxaaFloat subpixG = subpixF * subpixF;
    FxaaFloat pixelOffset = (dst * (-spanLengthRcp)) + 0.5;
    FxaaFloat subpixH = subpixG * fxaaQualitySubpix;
	/* ===== */
    FxaaFloat pixelOffsetGood = goodSpan ? pixelOffset : 0.0;
    FxaaFloat pixelOffsetSubpix = max(pixelOffsetGood, subpixH);
    if(!horzSpan)
        posM.x += pixelOffsetSubpix * lengthSign;
    if(horzSpan)
        posM.y += pixelOffsetSubpix * lengthSign;
		#if (FXAA_DISCARD == 1)
    return FxaaTexTop(tex, posM);
		#else
    return FxaaFloat4(FxaaTexTop(tex, posM).xyz, lumaM);
		#endif
}
/* ========== */

void main() {
    gl_FragColor = FxaaPixelShader(vUv, vec4(0.0), tDiffuse, tDiffuse, tDiffuse, resolution, vec4(0.0), vec4(0.0), vec4(0.0), 0.75, 0.166, 0.0833, 0.0, 0.0, 0.0, vec4(0.0));
    gl_FragColor.a = texture2D(tDiffuse, vUv).a;
}
