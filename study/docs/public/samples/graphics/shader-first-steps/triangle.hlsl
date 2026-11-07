cbuffer Parameters : register(b0)
{
    float4 tint;
    float4 controls; // x: horizontal offset, y: use UV color (0 or 1)
};

struct VertexInput
{
    float2 position : POSITION;
    float2 uv : TEXCOORD0;
};

struct VertexOutput
{
    float4 position : SV_Position;
    float2 uv : TEXCOORD0;
};

VertexOutput VSMain(VertexInput input)
{
    VertexOutput output;
    output.position = float4(input.position + float2(controls.x, 0.0), 0.0, 1.0);
    output.uv = input.uv;
    return output;
}

float4 PSMain(VertexOutput input) : SV_Target
{
    float3 base = lerp(float3(1.0, 1.0, 1.0), float3(input.uv, 0.25), controls.y);
    return float4(base * tint.rgb, 1.0);
}
