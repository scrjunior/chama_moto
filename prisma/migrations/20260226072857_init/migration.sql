-- CreateTable
CREATE TABLE `Taxista` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `apelido` VARCHAR(191) NOT NULL,
    `documento` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Taxista_documento_key`(`documento`),
    UNIQUE INDEX `Taxista_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Moto` (
    `id` VARCHAR(191) NOT NULL,
    `nomeMoto` VARCHAR(191) NOT NULL,
    `matricula` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `taxistaId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Moto_matricula_key`(`matricula`),
    UNIQUE INDEX `Moto_taxistaId_key`(`taxistaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Moto` ADD CONSTRAINT `Moto_taxistaId_fkey` FOREIGN KEY (`taxistaId`) REFERENCES `Taxista`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
