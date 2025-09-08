import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;

@service
@server("http://localhost:3000", "Development server")
namespace InfluencerAPI {

  // Domain Models
  model InfluencerPost {
    id: int32;
    influencer_id: int32;
    text: string;
    likes: int32;
    comments: int32;
    posted_at: utcDateTime;
    created_at: utcDateTime;
    updated_at: utcDateTime;
  }

  model InfluencerStats {
    influencer_id: int32;
    avg_likes: string;
    avg_comments: string;
    post_count: int32;
  }

  model TopInfluencer {
    influencer_id: int32;
    avg_likes?: string;
    avg_comments?: string;
    post_count: int32;
  }

  model NounCount {
    noun: string;
    count: int32;
  }

  model NounAnalysisResult {
    influencer_id: int32;
    total_posts: int32;
    nouns: NounCount[];
  }

  model ErrorResponse {
    error: string;
    details?: string;
  }

  model HealthResponse {
    status: "OK" | "ERROR";
    timestamp: utcDateTime;
  }

  model ImportResultResponse {
    success: boolean;
    message: string;
    data: {
      totalProcessed: int32;
      totalImported: int32;
      totalErrors: int32;
      fileName: string;
      fileSize: int32;
    };
    timestamp: utcDateTime;
  }

  // API Routes
  @route("/api")
  interface ApiRoutes {
    @get
    @route("/health")
    health(): HealthResponse;

    @get
    @route("/influencers/{influencerId}/stats")
    getInfluencerStats(@path influencerId: int32): InfluencerStats | ErrorResponse;

    @get
    @route("/influencers/top/likes")
    getTopInfluencersByLikes(): TopInfluencer[] | ErrorResponse;

    @get
    @route("/influencers/top/comments")
    getTopInfluencersByComments(): TopInfluencer[] | ErrorResponse;

    @get
    @route("/influencers/{influencerId}/nouns")
    getInfluencerNouns(@path influencerId: int32): NounAnalysisResult | ErrorResponse;

    @post
    @route("/import/csv")
    importCSV(@body _: {}): ImportResultResponse;

    @get
    @route("/import/status")
    getImportStatus(): ImportResultResponse;
  }
}