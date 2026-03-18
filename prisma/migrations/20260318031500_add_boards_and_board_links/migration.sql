-- CreateEnum
CREATE TYPE "public"."BoardVisibility" AS ENUM ('Public', 'Private', 'Unlisted');

-- CreateTable
CREATE TABLE "public"."boards" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "public"."BoardVisibility" NOT NULL DEFAULT 'Private',
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."board_links" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boards_slug_key" ON "public"."boards"("slug");

-- CreateIndex
CREATE INDEX "boards_user_id_idx" ON "public"."boards"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_links_board_id_link_id_key" ON "public"."board_links"("board_id", "link_id");

-- CreateIndex
CREATE INDEX "board_links_board_id_position_idx" ON "public"."board_links"("board_id", "position");

-- AddForeignKey
ALTER TABLE "public"."boards" ADD CONSTRAINT "boards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."board_links" ADD CONSTRAINT "board_links_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."board_links" ADD CONSTRAINT "board_links_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
