-- CreateTable
CREATE TABLE "public"."click_events" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "user_agent" TEXT NOT NULL DEFAULT 'unknown',

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_click_events_link_id_clicked_at" ON "public"."click_events"("link_id", "clicked_at");

-- AddForeignKey
ALTER TABLE "public"."click_events" ADD CONSTRAINT "click_events_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
